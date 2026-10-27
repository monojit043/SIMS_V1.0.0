const asyncHandler = require("../utils/asyncHandler");
const specialItemTagService = require("../services/specialItemTag.service");

const sync = asyncHandler(async (req, res) => {
  const rows = await specialItemTagService.syncForDocument(
    req.body.pidDocumentId || null,
    req.body.tags || [],
    req.user.id
  );
  res.status(200).json({ success: true, data: rows });
});

const list = asyncHandler(async (req, res) => {
  const rows = await specialItemTagService.list(req.query);
  res.status(200).json({ success: true, data: rows });
});

const remove = asyncHandler(async (req, res) => {
  await specialItemTagService.remove(req.params.id);
  res.status(204).send();
});

module.exports = { sync, list, remove };
