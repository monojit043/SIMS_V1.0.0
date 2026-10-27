const { Op } = require("sequelize");
const { sequelize } = require("../config/db");
const SpecialItemTag = require("../models/SpecialItemTag");
const libraryTaskService = require("./libraryTask.service");
const ApiError = require("../utils/ApiError");

function buildTagRow(tag, pidDocumentId, userId) {
  if (!tag.highlightId) {
    throw new ApiError(400, "Each tag requires a highlightId");
  }

  return {
    highlightId: tag.highlightId,
    pidDocumentId: pidDocumentId || null,
    page: tag.page || 1,
    tagNumber: tag.tagNumber || "",
    jobNumber: tag.jobNumber || "",
    unitNumber: tag.unitNumber || "",
    size: tag.size || "",
    rating: tag.rating || "",
    pipingSpec: tag.pipingSpec || "",
    itemName: tag.itemName || "",
    quantity: tag.quantity || "",
    lineNumber: tag.lineNumber || "",
    specialNote: tag.specialNote || "",
    licensorRequirement: tag.licensorRequirement || "",
    type: tag.type || "highlight",
    xPct: tag.xPct ?? null,
    yPct: tag.yPct ?? null,
    wPct: tag.wPct ?? null,
    hPct: tag.hPct ?? null,
    color: tag.color || "",
    fontFamily: tag.fontFamily || "",
    fontSize: tag.fontSize || "",
    bold: !!tag.bold,
    italic: !!tag.italic,
    underline: !!tag.underline,
    updatedBy: userId,
  };
}

// Full replace-sync for one P&ID document: upserts every tag currently on it (matched by the
// client-side highlightId) and removes rows for tags that no longer exist — mirrors how
// pid_documents.highlights is synced (always the current full state, not incremental diffs).
async function syncForDocument(pidDocumentId, tags, userId) {
  if (!Array.isArray(tags)) {
    throw new ApiError(400, "tags must be an array");
  }

  const taggedOnly = tags.filter((tag) => (tag.tagNumber || "").trim());

  const existing = await SpecialItemTag.findAll({
    where: { pidDocumentId: pidDocumentId || null },
    attributes: ["highlightId"],
  });
  const existingHighlightIds = new Set(existing.map((row) => row.highlightId));
  const newlyCreatedTags = [];

  await sequelize.transaction(async (transaction) => {
    for (const tag of taggedOnly) {
      const row = buildTagRow(tag, pidDocumentId, userId);
      const [record] = await SpecialItemTag.upsert(row, { transaction, returning: true });
      if (!existingHighlightIds.has(tag.highlightId)) {
        newlyCreatedTags.push(record);
      }
    }

    const where = pidDocumentId ? { pidDocumentId } : { pidDocumentId: null };
    const keepIds = taggedOnly.map((tag) => tag.highlightId);
    where.highlightId = { [Op.notIn]: keepIds.length ? keepIds : [""] };

    await SpecialItemTag.destroy({ where, transaction });
  });

  // Raises one 3D-model-library task per genuinely new tagged item — not for edits to existing
  // ones. Non-fatal: the tag itself already saved successfully either way.
  if (newlyCreatedTags.length) {
    try {
      await libraryTaskService.createForNewTags(newlyCreatedTags, userId);
    } catch (error) {
      // Swallow: the tag sync already succeeded, and this can be retried by re-saving.
    }
  }

  return list(pidDocumentId ? { pidDocumentId } : {});
}

async function list(filters) {
  const where = {};
  if (filters.pidDocumentId) where.pidDocumentId = filters.pidDocumentId;
  if (filters.jobNumber) where.jobNumber = filters.jobNumber;
  if (filters.unitNumber) where.unitNumber = filters.unitNumber;
  if (filters.tagNumber) where.tagNumber = { [Op.iLike]: `%${filters.tagNumber}%` };

  return SpecialItemTag.findAll({ where, order: [["updatedAt", "DESC"]] });
}

async function remove(id) {
  const row = await SpecialItemTag.findByPk(id);
  if (!row) {
    throw new ApiError(404, "Special item tag not found");
  }
  await row.destroy();
}

module.exports = { syncForDocument, list, remove };
