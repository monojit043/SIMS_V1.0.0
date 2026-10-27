const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

// highlights is a free-form JSONB array of annotation objects (highlight boxes, shapes,
// text callouts, stamps, etc.) mirrored 1:1 from the P&ID markup editor's client-side model.
const PidDocument = sequelize.define(
  "PidDocument",
  {
    name: { type: DataTypes.STRING, allowNull: false },
    jobNumber: { type: DataTypes.STRING, defaultValue: "" },
    unitNumber: { type: DataTypes.STRING, defaultValue: "" },
    sourceType: {
      type: DataTypes.STRING,
      defaultValue: "image",
      validate: { isIn: [["image", "pdf"]] },
    },
    originalName: { type: DataTypes.STRING },
    storedFileName: { type: DataTypes.STRING },
    filePath: { type: DataTypes.STRING },
    highlights: { type: DataTypes.JSONB, defaultValue: [] },
    // employee_id from MASTER_EMPLOYEE_DB (a different database — no cross-database FK possible).
    updatedBy: { type: DataTypes.STRING(20) },
    // Set when this document was imported from PIMS_SQL.pid_master_index. Not unique: each PIMS
    // revision we import gets its own row (see pimsRevSortKey below) so an older revision's file
    // and highlights are never deleted or overwritten when a newer revision comes in.
    pimsMasterIndexId: { type: DataTypes.INTEGER, allowNull: true },
    // Revision fingerprint of the PIMS_SQL.pid_documents row this was copied from — identifies
    // which specific revision this row represents, and lets us detect when PIMS has a newer one.
    pimsRevSortKey: { type: DataTypes.INTEGER, allowNull: true },
    pimsFileHash: { type: DataTypes.STRING, allowNull: true },
  },
  { tableName: "pid_documents" }
);

module.exports = PidDocument;
