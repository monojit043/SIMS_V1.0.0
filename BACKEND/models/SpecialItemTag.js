const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");
const PidDocument = require("./PidDocument");

// One row per Highlight/Note tag placed on a P&ID — mirrors the pid-dialog form fields plus
// Job Number/Unit Number, kept separate from pid_documents.highlights (which stays the full
// annotation JSON used to redraw the markup) so this data is easy to query/report on directly.
const SpecialItemTag = sequelize.define(
  "SpecialItemTag",
  {
    highlightId: { type: DataTypes.STRING, allowNull: false, unique: true },
    pidDocumentId: {
      type: DataTypes.INTEGER,
      references: { model: PidDocument, key: "id" },
    },
    page: { type: DataTypes.INTEGER, defaultValue: 1 },
    tagNumber: { type: DataTypes.STRING, defaultValue: "" },
    jobNumber: { type: DataTypes.STRING, defaultValue: "" },
    unitNumber: { type: DataTypes.STRING, defaultValue: "" },
    size: { type: DataTypes.STRING, defaultValue: "" },
    rating: { type: DataTypes.STRING, defaultValue: "" },
    pipingSpec: { type: DataTypes.STRING, defaultValue: "" },
    itemName: { type: DataTypes.STRING, defaultValue: "" },
    quantity: { type: DataTypes.STRING, defaultValue: "" },
    lineNumber: { type: DataTypes.STRING, defaultValue: "" },
    specialNote: { type: DataTypes.STRING, defaultValue: "" },
    licensorRequirement: { type: DataTypes.STRING, defaultValue: "" },
    // Position/style — this row is now the sole source of truth for a tagged highlight (it no
    // longer also lives in pid_documents.highlights), so it needs everything required to redraw
    // it: box position (xPct/yPct/wPct/hPct — wPct/hPct are null for a single-point "note" pin),
    // its color, and its text style.
    type: { type: DataTypes.STRING, defaultValue: "highlight" },
    xPct: { type: DataTypes.FLOAT },
    yPct: { type: DataTypes.FLOAT },
    wPct: { type: DataTypes.FLOAT, allowNull: true },
    hPct: { type: DataTypes.FLOAT, allowNull: true },
    color: { type: DataTypes.STRING, defaultValue: "" },
    fontFamily: { type: DataTypes.STRING, defaultValue: "" },
    fontSize: { type: DataTypes.STRING, defaultValue: "" },
    bold: { type: DataTypes.BOOLEAN, defaultValue: false },
    italic: { type: DataTypes.BOOLEAN, defaultValue: false },
    underline: { type: DataTypes.BOOLEAN, defaultValue: false },
    // employee_id from MASTER_EMPLOYEE_DB (a different database — no cross-database FK possible).
    updatedBy: { type: DataTypes.STRING(20) },
  },
  {
    tableName: "special_item_tags",
    indexes: [{ fields: ["tagNumber"] }, { fields: ["jobNumber", "unitNumber"] }, { fields: ["pidDocumentId"] }],
  }
);

module.exports = SpecialItemTag;
