const { DataTypes } = require("sequelize");
const { pimsSequelize } = require("../config/externalDb");

// Read-only mapping onto PIMS_SQL.projects — only used to show a human-readable project name
// (e.g. "B378 — GAIL PPU") next to the project code. We never write to this table from SIMS.
const Project = pimsSequelize.define(
  "Project",
  {
    id: { type: DataTypes.STRING(50), primaryKey: true },
    name: { type: DataTypes.STRING },
    created_by: { type: DataTypes.STRING },
    created_at: { type: DataTypes.DATE },
  },
  { tableName: "projects", timestamps: false }
);

module.exports = Project;
