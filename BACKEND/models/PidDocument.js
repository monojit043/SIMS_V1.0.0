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
    // employee ID from PC-2 (eil_employees, a different database — no cross-database FK possible).
    updatedBy: { type: DataTypes.STRING(20) },
    // Set when this document was copied from ePULSE's P&ID module (pid_master_index). Not unique:
    // each ePULSE revision we copy gets its own row (see epulseDocumentId below) so an older
    // revision's file and highlights are never deleted or overwritten when a newer one comes in.
    epulseMasterIndexId: { type: DataTypes.INTEGER, allowNull: true },
    // Which ePULSE revision (pid_documents row) this copy is — lets us detect when ePULSE has a newer one.
    epulseDocumentId: { type: DataTypes.INTEGER, allowNull: true },
    revLabel: { type: DataTypes.STRING(20), allowNull: true },
    revSortKey: { type: DataTypes.INTEGER, allowNull: true },
    fileHash: { type: DataTypes.STRING, allowNull: true },
  },
  { tableName: "pid_documents" }
);

module.exports = PidDocument;
