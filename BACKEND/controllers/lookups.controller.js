const lookupsService = require("../services/lookups.service");
const asyncHandler = require("../utils/asyncHandler");
const { assertUnit } = require("../middleware/auth.middleware");

function getAll(req, res) {
  res.status(200).json({ success: true, data: lookupsService.getAll() });
}

// The user's jobs + units (their IPMCS teams), already read live by requireAuth
const getMyAssignments = asyncHandler(async (req, res) => {
  res.status(200).json({ success: true, data: lookupsService.groupAccess(req.user.access) });
});

const getPidMasterIndex = asyncHandler(async (req, res) => {
  assertUnit(req.user, req.query.jobNo, req.query.unitNo);
  const rows = await lookupsService.getPidMasterIndex(req.query.jobNo, req.query.unitNo);
  res.status(200).json({ success: true, data: rows });
});

const getLineNumbers = asyncHandler(async (req, res) => {
  assertUnit(req.user, req.query.jobNo, req.query.unitNo);
  const rows = await lookupsService.getLineNumbers(req.query.jobNo, req.query.unitNo);
  res.status(200).json({ success: true, data: rows });
});

module.exports = { getAll, getMyAssignments, getPidMasterIndex, getLineNumbers };
