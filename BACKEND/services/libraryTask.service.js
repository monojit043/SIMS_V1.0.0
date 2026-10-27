const { Op } = require("sequelize");
const LibraryTask = require("../models/LibraryTask");
const SpecialItemTag = require("../models/SpecialItemTag");
const ApiError = require("../utils/ApiError");

// Called from specialItemTag.service.js right after new tags are created — one task per
// genuinely new tagged item (not for edits to existing ones).
async function createForNewTags(tagRows, userId) {
  for (const tag of tagRows) {
    await LibraryTask.create({
      specialItemTagId: tag.id,
      tagNumber: tag.tagNumber || "",
      itemName: tag.itemName || "",
      jobNumber: tag.jobNumber || "",
      unitNumber: tag.unitNumber || "",
      createdBy: userId,
    });
  }
}

// One-off (repeatable) catch-up for items tagged before this feature existed, or any tag whose
// automatic task-creation silently failed (createForNewTags swallows its own errors so the tag
// save itself never fails) — creates a Pending task for every SpecialItemTag that doesn't already
// have one.
async function backfillMissingTasks(userId) {
  const existingTaskTagIds = (
    await LibraryTask.findAll({
      where: { specialItemTagId: { [Op.ne]: null } },
      attributes: ["specialItemTagId"],
    })
  ).map((row) => row.specialItemTagId);

  const missingTags = await SpecialItemTag.findAll({
    where: existingTaskTagIds.length ? { id: { [Op.notIn]: existingTaskTagIds } } : {},
  });

  for (const tag of missingTags) {
    await LibraryTask.create({
      specialItemTagId: tag.id,
      tagNumber: tag.tagNumber || "",
      itemName: tag.itemName || "",
      jobNumber: tag.jobNumber || "",
      unitNumber: tag.unitNumber || "",
      createdBy: userId,
    });
  }

  return missingTags.length;
}

async function list(filters) {
  const where = {};
  if (filters.status) where.status = filters.status;
  return LibraryTask.findAll({ where, order: [["createdAt", "DESC"]] });
}

async function complete(id, user) {
  const task = await LibraryTask.findByPk(id);
  if (!task) {
    throw new ApiError(404, "Task not found");
  }
  if (!user.isAdmin && task.assignedTo !== user.id) {
    throw new ApiError(403, "Only an admin or the person this task is delegated to can mark it done");
  }
  task.status = "Done";
  task.completedBy = user.id;
  task.completedAt = new Date();
  await task.save();
  return task;
}

async function delegate(id, assigneeId, delegatedBy) {
  if (!assigneeId) {
    throw new ApiError(400, "assignedTo is required");
  }
  const task = await LibraryTask.findByPk(id);
  if (!task) {
    throw new ApiError(404, "Task not found");
  }
  task.assignedTo = assigneeId;
  task.delegatedBy = delegatedBy;
  task.delegatedAt = new Date();
  await task.save();
  return task;
}

module.exports = { createForNewTags, backfillMissingTasks, list, complete, delegate };
