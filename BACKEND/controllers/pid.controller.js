const asyncHandler = require("../utils/asyncHandler");
const pidService = require("../services/pid.service");
const specialItemTagService = require("../services/specialItemTag.service");
const { assertUnit } = require("../middleware/auth.middleware");

// A P&ID copy belongs to a job + unit — only that unit's IPMCS team works on it. A locally
// uploaded P&ID with no job / unit is open to any signed-in SIMS user.
function assertDocUnit(user, doc) {
  if (doc.jobNumber || doc.unitNumber) assertUnit(user, doc.jobNumber, doc.unitNumber);
}

const create = asyncHandler(async (req, res) => {
  if (req.body.jobNumber || req.body.unitNumber) assertUnit(req.user, req.body.jobNumber, req.body.unitNumber);
  const doc = await pidService.create({
    name: req.body.name,
    jobNumber: req.body.jobNumber,
    unitNumber: req.body.unitNumber,
    highlights: req.body.highlights,
    file: req.file,
    userId: req.user.id,
  });
  res.status(201).json({ success: true, data: doc });
});

const list = asyncHandler(async (req, res) => {
  if (req.query.jobNumber && req.query.unitNumber) assertUnit(req.user, req.query.jobNumber, req.query.unitNumber);
  const docs = await pidService.list({ ...req.query, units: req.user.access });
  res.status(200).json({ success: true, data: docs });
});

const getById = asyncHandler(async (req, res) => {
  const doc = await pidService.getById(req.params.id);
  assertDocUnit(req.user, doc);
  // Tagged highlights now live solely in special_item_tags (not in doc.highlights) — merge them
  // back in here so the frontend has everything it needs to redraw the page in one response.
  const specialItemTags = await specialItemTagService.list({ pidDocumentId: doc.id });
  res.status(200).json({ success: true, data: { ...doc.toJSON(), specialItemTags } });
});

const update = asyncHandler(async (req, res) => {
  assertDocUnit(req.user, await pidService.getById(req.params.id));
  if (req.body.jobNumber || req.body.unitNumber) assertUnit(req.user, req.body.jobNumber, req.body.unitNumber);
  const doc = await pidService.update(req.params.id, {
    name: req.body.name,
    jobNumber: req.body.jobNumber,
    unitNumber: req.body.unitNumber,
    highlights: req.body.highlights,
    file: req.file,
    userId: req.user.id,
  });
  res.status(200).json({ success: true, data: doc });
});

const remove = asyncHandler(async (req, res) => {
  assertDocUnit(req.user, await pidService.getById(req.params.id));
  await pidService.remove(req.params.id);
  res.status(204).send();
});

// Copy the current revision of an ePULSE P&ID into SIMS for highlighting
const importFromEpulse = asyncHandler(async (req, res) => {
  const source = await pidService.importFromEpulse(req.body.masterIndexId);
  assertUnit(req.user, source.masterIndex.job_no, source.masterIndex.unit_no);
  const doc = await pidService.copyFromEpulse(source, req.user.id);
  res.status(200).json({ success: true, data: doc });
});

module.exports = { create, list, getById, update, remove, importFromEpulse };
