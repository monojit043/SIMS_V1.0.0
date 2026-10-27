const fs = require("fs");
const St6Report = require("../models/St6Report");
const ApiError = require("../utils/ApiError");

async function create({ jobNumber, unitNumber, file, userId }) {
  if (!jobNumber || !unitNumber) {
    throw new ApiError(400, "jobNumber and unitNumber are required");
  }
  if (!file) {
    throw new ApiError(400, "A file is required");
  }

  return St6Report.create({
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

  return St6Report.findAll({ where, order: [["createdAt", "DESC"]] });
}

async function remove(id) {
  const report = await St6Report.findByPk(id);
  if (!report) {
    throw new ApiError(404, "ST6 report not found");
  }
  if (report.filePath) fs.unlink(report.filePath, () => {});
  await report.destroy();
}

module.exports = { create, list, remove };
