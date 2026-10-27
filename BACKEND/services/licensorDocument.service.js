const fs = require("fs");
const LicensorDocument = require("../models/LicensorDocument");
const ApiError = require("../utils/ApiError");

async function create({ jobNumber, unitNumber, file, userId }) {
  if (!jobNumber || !unitNumber) {
    throw new ApiError(400, "jobNumber and unitNumber are required");
  }
  if (!file) {
    throw new ApiError(400, "A file is required");
  }

  return LicensorDocument.create({
    jobNumber,
    unitNumber,
    originalName: file.originalname,
    storedFileName: file.filename,
    filePath: file.path,
    mimeType: file.mimetype,
    size: file.size,
    uploadedBy: userId,
  });
}

async function list(filters) {
  const where = {};
  if (filters.jobNumber) where.jobNumber = filters.jobNumber;
  if (filters.unitNumber) where.unitNumber = filters.unitNumber;

  return LicensorDocument.findAll({ where, order: [["createdAt", "DESC"]] });
}

async function remove(id) {
  const doc = await LicensorDocument.findByPk(id);
  if (!doc) {
    throw new ApiError(404, "Licensor document not found");
  }
  if (doc.filePath) fs.unlink(doc.filePath, () => {});
  await doc.destroy();
}

module.exports = { create, list, remove };
