const asyncHandler = require("../utils/asyncHandler");
const pidService = require("../services/pid.service");
const specialItemTagService = require("../services/specialItemTag.service");

const create = asyncHandler(async (req, res) => {
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
  const docs = await pidService.list(req.query);
  res.status(200).json({ success: true, data: docs });
});

const getById = asyncHandler(async (req, res) => {
  const doc = await pidService.getById(req.params.id);
  // Tagged highlights now live solely in special_item_tags (not in doc.highlights) — merge them
  // back in here so the frontend has everything it needs to redraw the page in one response.
  const specialItemTags = await specialItemTagService.list({ pidDocumentId: doc.id });
  res.status(200).json({ success: true, data: { ...doc.toJSON(), specialItemTags } });
});

const update = asyncHandler(async (req, res) => {
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
  await pidService.remove(req.params.id);
  res.status(204).send();
});

const importFromPims = asyncHandler(async (req, res) => {
  const doc = await pidService.importFromPims(req.body.masterIndexId, req.user.id);
  res.status(200).json({ success: true, data: doc });
});

module.exports = { create, list, getById, update, remove, importFromPims };
