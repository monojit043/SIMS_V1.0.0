const fs = require("fs");
const path = require("path");
const { Op } = require("sequelize");
const PidDocument = require("../models/PidDocument");
const { queryEpulse } = require("../config/externalDb");
const ApiError = require("../utils/ApiError");

// ePULSE's uploads folder — its pid_documents.file_path ("B862/101/PID/…pdf") is relative to it
const EPULSE_UPLOADS_ROOT = process.env.EPULSE_UPLOADS_ROOT;
const PID_UPLOAD_DIR = path.join(__dirname, "..", "uploads", "pid");

// Full path of an ePULSE upload, or null if missing / outside the uploads folder
function resolveEpulseFilePath(relativeFilePath) {
  if (!EPULSE_UPLOADS_ROOT) throw new ApiError(500, "EPULSE_UPLOADS_ROOT is not set in .env");
  const base = path.resolve(EPULSE_UPLOADS_ROOT);
  const full = path.resolve(base, relativeFilePath || "");
  if (!full.startsWith(base + path.sep)) return null;
  return fs.existsSync(full) ? full : null;
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

// filters.units: [{ jobNo, unitNo }] the user may see (their IPMCS teams)
async function list(filters) {
  const where = {};
  if (filters.jobNumber) where.jobNumber = filters.jobNumber;
  if (filters.unitNumber) where.unitNumber = filters.unitNumber;
  if (filters.units) {
    where[Op.or] = [
      ...filters.units.map((u) => ({ jobNumber: u.jobNo, unitNumber: u.unitNo })),
      { jobNumber: "", unitNumber: "" },   // a P&ID uploaded locally with no job / unit
    ];
  }

  return PidDocument.findAll({
    where,
    attributes: ["id", "name", "jobNumber", "unitNumber", "sourceType", "revLabel", "createdAt", "updatedAt"],
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

// "Open for Highlighting" on a P&ID of ePULSE's index: copies the CURRENT revision's PDF into
// SIMS (one row per revision — older revisions' copies and highlights are never touched).
async function importFromEpulse(masterIndexId) {
  const { rows: [masterIndex] } = await queryEpulse(
    `SELECT id, pid_name, job_no, unit_no FROM pid_master_index WHERE id = $1 AND status = 'active'`,
    [Number(masterIndexId) || 0]
  );
  if (!masterIndex) {
    throw new ApiError(404, "P&ID not found in ePULSE's P&ID index");
  }
  const { rows: [doc] } = await queryEpulse(
    `SELECT id, file_name, file_path, file_hash, rev_label, rev_sort_key FROM pid_documents
     WHERE master_index_id = $1 AND status = 'current'`,
    [masterIndex.id]
  );
  if (!doc) {
    throw new ApiError(404, `No PDF uploaded in ePULSE yet for ${masterIndex.pid_name}`);
  }
  return { masterIndex, doc };
}

async function copyFromEpulse({ masterIndex, doc }, userId) {
  // A copy of exactly this ePULSE revision already exists — reuse it, with its highlights.
  const existing = await PidDocument.findOne({ where: { epulseMasterIndexId: masterIndex.id, epulseDocumentId: doc.id } });
  if (existing) return existing;

  const sourcePath = resolveEpulseFilePath(doc.file_path);
  if (!sourcePath) {
    throw new ApiError(404, "The P&ID file could not be found in ePULSE's uploads folder");
  }

  fs.mkdirSync(PID_UPLOAD_DIR, { recursive: true });
  const storedFileName = `${Date.now()}_epulse_${doc.file_name}`;
  const destPath = path.join(PID_UPLOAD_DIR, storedFileName);
  fs.copyFileSync(sourcePath, destPath);

  return PidDocument.create({
    name: masterIndex.pid_name,
    jobNumber: masterIndex.job_no || "",
    unitNumber: masterIndex.unit_no || "",
    highlights: [],
    sourceType: path.extname(doc.file_name).toLowerCase() === ".pdf" ? "pdf" : "image",
    originalName: doc.file_name,
    storedFileName,
    filePath: destPath,
    updatedBy: userId,
    epulseMasterIndexId: masterIndex.id,
    epulseDocumentId: doc.id,
    revLabel: doc.rev_label,
    revSortKey: doc.rev_sort_key,
    fileHash: doc.file_hash,
  });
}

module.exports = { create, list, getById, update, remove, importFromEpulse, copyFromEpulse };
