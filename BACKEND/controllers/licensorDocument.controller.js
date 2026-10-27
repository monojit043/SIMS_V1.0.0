const asyncHandler = require("../utils/asyncHandler");
const licensorDocumentService = require("../services/licensorDocument.service");

const create = asyncHandler(async (req, res) => {
  const doc = await licensorDocumentService.create({
    jobNumber: req.body.jobNumber,
    unitNumber: req.body.unitNumber,
    file: req.file,
    userId: req.user.id,
  });
  res.status(201).json({ success: true, data: doc });
});

const list = asyncHandler(async (req, res) => {
  const docs = await licensorDocumentService.list(req.query);
  res.status(200).json({ success: true, data: docs });
});

const remove = asyncHandler(async (req, res) => {
  await licensorDocumentService.remove(req.params.id);
  res.status(204).send();
});

module.exports = { create, list, remove };
