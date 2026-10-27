const lookupsService = require("../services/lookups.service");
const asyncHandler = require("../utils/asyncHandler");

function getAll(req, res) {
  res.status(200).json({ success: true, data: lookupsService.getAll() });
}

const getMyAssignments = asyncHandler(async (req, res) => {
  const assignments = await lookupsService.getMyAssignments(req.user.id);
  res.status(200).json({ success: true, data: assignments });
});

const getPidMasterIndex = asyncHandler(async (req, res) => {
  const rows = await lookupsService.getPidMasterIndex(req.query.jobNo, req.query.unitNo);
  res.status(200).json({ success: true, data: rows });
});

const getLineNumbers = asyncHandler(async (req, res) => {
  const rows = await lookupsService.getLineNumbers(req.query.jobNo, req.query.unitNo);
  res.status(200).json({ success: true, data: rows });
});

module.exports = { getAll, getMyAssignments, getPidMasterIndex, getLineNumbers };
