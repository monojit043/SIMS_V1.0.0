const asyncHandler = require("../utils/asyncHandler");
const st6ReportService = require("../services/st6Report.service");

const create = asyncHandler(async (req, res) => {
  const report = await st6ReportService.create({
    jobNumber: req.body.jobNumber,
    unitNumber: req.body.unitNumber,
    file: req.file,
    userId: req.user.id,
  });
  res.status(201).json({ success: true, data: report });
});

const list = asyncHandler(async (req, res) => {
  const reports = await st6ReportService.list(req.query);
  res.status(200).json({ success: true, data: reports });
});

const remove = asyncHandler(async (req, res) => {
  await st6ReportService.remove(req.params.id);
  res.status(204).send();
});

module.exports = { create, list, remove };
