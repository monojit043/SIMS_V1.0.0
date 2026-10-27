const fs = require("fs");
const path = require("path");
const PidDocument = require("../models/PidDocument");
const PidMasterIndex = require("../models/PidMasterIndex");
const PimsPidDocument = require("../models/PimsPidDocument");
const ApiError = require("../utils/ApiError");

const PIMS_UPLOADS_DIR = process.env.PIMS_UPLOADS_DIR || "D:\\PIMS_SQL\\backend\\uploads";
const PID_UPLOAD_DIR = path.join(__dirname, "..", "uploads", "pid");

// PIMS stores file_path relative to its own uploads dir, but at least one file on disk was
// found saved with a doubled extension (".pdf.pdf") that the DB row doesn't reflect. Try the
// exact path first, then the doubled-extension variant, then fall back to scanning the
// directory for a file whose name starts with the recorded file_name.
function resolvePimsFilePath(relativeFilePath) {
  const exact = path.join(PIMS_UPLOADS_DIR, relativeFilePath);
  if (fs.existsSync(exact)) return exact;

  const ext = path.extname(relativeFilePath);
  const doubled = exact + ext;
  if (ext && fs.existsSync(doubled)) return doubled;

  const dir = path.dirname(exact);
  const baseName = path.basename(relativeFilePath);
  if (fs.existsSync(dir)) {
    const match = fs.readdirSync(dir).find((entry) => entry.startsWith(baseName));
    if (match) return path.join(dir, match);
  }

  return null;
}

function parseHighlights(raw) {
  if (raw === undefined) return undefined;
  if (Array.isArray(raw)) return raw;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error("not an array");
    return parsed;
  } catch (error) {
    throw new ApiError(400, "highlights must be a JSON array");
  }
}

function sourceTypeForFile(file) {
  return path.extname(file.originalname).toLowerCase() === ".pdf" ? "pdf" : "image";
}

async function create({ name, jobNumber, unitNumber, highlights, file, userId }) {
  if (!name) {
    throw new ApiError(400, "name is required");
  }

  return PidDocument.create({
    name,
    jobNumber: jobNumber || "",
    unitNumber: unitNumber || "",
    highlights: parseHighlights(highlights) || [],
    sourceType: file ? sourceTypeForFile(file) : "image",
    originalName: file ? file.originalname : undefined,
    storedFileName: file ? file.filename : undefined,
    filePath: file ? file.path : undefined,
    updatedBy: userId,
  });
}

async function list(filters) {
  const where = {};
  if (filters.jobNumber) where.jobNumber = filters.jobNumber;
  if (filters.unitNumber) where.unitNumber = filters.unitNumber;

  return PidDocument.findAll({
    where,
    attributes: ["id", "name", "jobNumber", "unitNumber", "sourceType", "createdAt", "updatedAt"],
    order: [["updatedAt", "DESC"]],
  });
}

async function getById(id) {
  const doc = await PidDocument.findByPk(id);
  if (!doc) {
    throw new ApiError(404, "P&ID document not found");
  }
  return doc;
}

async function update(id, { name, jobNumber, unitNumber, highlights, file, userId }) {
  const doc = await getById(id);

  if (name !== undefined) doc.name = name;
  if (jobNumber !== undefined) doc.jobNumber = jobNumber;
  if (unitNumber !== undefined) doc.unitNumber = unitNumber;

  const parsedHighlights = parseHighlights(highlights);
  if (parsedHighlights !== undefined) doc.highlights = parsedHighlights;

  if (file) {
    if (doc.filePath) fs.unlink(doc.filePath, () => {});
    doc.sourceType = sourceTypeForFile(file);
    doc.originalName = file.originalname;
    doc.storedFileName = file.filename;
    doc.filePath = file.path;
  }

  doc.updatedBy = userId;
  await doc.save();
  return doc;
}

async function remove(id) {
  const doc = await getById(id);
  if (doc.filePath) fs.unlink(doc.filePath, () => {});
  await doc.destroy();
}

async function importFromPims(masterIndexId, userId) {
  const masterIndex = await PidMasterIndex.findByPk(masterIndexId);
  if (!masterIndex) {
    throw new ApiError(404, "P&ID master index entry not found");
  }

  const pimsDoc = await PimsPidDocument.findOne({
    where: { master_index_id: masterIndexId, status: "current" },
    order: [["rev_sort_key", "DESC"]],
  }) || (await PimsPidDocument.findOne({
    where: { master_index_id: masterIndexId },
    order: [["rev_sort_key", "DESC"]],
  }));

  if (!pimsDoc) {
    throw new ApiError(404, "No uploaded file found in PIMS for this P&ID");
  }

  // A row already exists for exactly this PIMS revision (same master index, same rev, same file
  // content) — reuse it as-is, including whatever highlights were drawn on it.
  const existing = await PidDocument.findOne({
    where: {
      pimsMasterIndexId: masterIndexId,
      pimsRevSortKey: pimsDoc.rev_sort_key,
      pimsFileHash: pimsDoc.file_hash,
    },
  });
  if (existing) return existing;

  // No row for this revision yet — either the very first import, or PIMS has a newer revision
  // than whatever we imported before. Either way, copy the file fresh and create a NEW row.
  // Older revisions' rows and files are left completely untouched (their highlights stay valid
  // and browsable) rather than being overwritten or deleted.
  const sourcePath = resolvePimsFilePath(pimsDoc.file_path);
  if (!sourcePath) {
    throw new ApiError(404, "PIMS P&ID file could not be located on disk");
  }

  fs.mkdirSync(PID_UPLOAD_DIR, { recursive: true });
  const storedFileName = `${Date.now()}_pims_${pimsDoc.file_name}`;
  const destPath = path.join(PID_UPLOAD_DIR, storedFileName);
  fs.copyFileSync(sourcePath, destPath);

  const sourceType = path.extname(pimsDoc.file_name).toLowerCase() === ".pdf" ? "pdf" : "image";

  return PidDocument.create({
    name: masterIndex.pid_name,
    jobNumber: masterIndex.job_no || "",
    unitNumber: masterIndex.unit_no || "",
    highlights: [],
    sourceType,
    originalName: pimsDoc.file_name,
    storedFileName,
    filePath: destPath,
    updatedBy: userId,
    pimsMasterIndexId: masterIndexId,
    pimsRevSortKey: pimsDoc.rev_sort_key,
    pimsFileHash: pimsDoc.file_hash,
  });
}

module.exports = { create, list, getById, update, remove, importFromPims };
