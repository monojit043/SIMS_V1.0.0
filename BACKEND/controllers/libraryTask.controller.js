const asyncHandler = require("../utils/asyncHandler");
const libraryTaskService = require("../services/libraryTask.service");
const ApiError = require("../utils/ApiError");

const list = asyncHandler(async (req, res) => {
  const rows = await libraryTaskService.list(req.query);
  res.status(200).json({ success: true, data: rows });
});

const complete = asyncHandler(async (req, res) => {
  const task = await libraryTaskService.complete(req.params.id, req.user);
  res.status(200).json({ success: true, data: task });
});

const delegate = asyncHandler(async (req, res) => {
  if (!req.user.isAdmin) {
    throw new ApiError(403, "Only admins can delegate a task");
  }
  const task = await libraryTaskService.delegate(req.params.id, req.body.assignedTo, req.user.id);
  res.status(200).json({ success: true, data: task });
});

const backfill = asyncHandler(async (req, res) => {
  if (!req.user.isAdmin) {
    throw new ApiError(403, "Only admins can run the backfill");
  }
  const createdCount = await libraryTaskService.backfillMissingTasks(req.user.id);
  res.status(200).json({ success: true, data: { createdCount } });
});

module.exports = { list, complete, delegate, backfill };
