const fs = require("fs");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const pidService = require("../services/pid.service");
const specialItemTagService = require("../services/specialItemTag.service");
const { assertUnit } = require("../middleware/auth.middleware");

// A P&ID copy belongs to a job + unit — only that unit's IPMCS team works on it. A locally
// uploaded P&ID with no job / unit is open to any signed-in SIMS user.
function assertDocUnit(user, doc) {
  if (doc.jobNumber || doc.unitNumber) assertUnit(user, doc.jobNumber, doc.unitNumber);
}

// P&IDs come only from ePULSE (POST /api/pid/import-from-epulse) — no uploaded drawings, so every
// highlight and special-item tag is tied to a real ePULSE P&ID revision.
const create = asyncHandler(async () => {
  throw new ApiError(403, 'P&IDs come from ePULSE — open one from Special Items Collection ("Open for Highlighting")');
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

// Saving highlights only: an ePULSE copy keeps its drawing, name, job and unit — a newer drawing
// comes as a new ePULSE revision, opened again from Special Items Collection.
const update = asyncHandler(async (req, res) => {
  const existing = await pidService.getById(req.params.id);
  assertDocUnit(req.user, existing);
  if (req.file) {
    if (req.file.path) fs.unlink(req.file.path, () => {});
    throw new ApiError(400, "The drawing can't be replaced in SIMS — upload the new revision in ePULSE and open it again");
  }
  const doc = await pidService.update(req.params.id, {
    highlights: req.body.highlights,
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
