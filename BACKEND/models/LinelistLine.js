const { DataTypes } = require("sequelize");
const { pimsSequelize } = require("../config/externalDb");

// Read-only mapping onto PIMS_SQL.linelist_lines — the actual line-list rows (one per line
// number) belonging to a linelist_uploads batch. Powers the Line Number dropdown in the P&ID
// highlight dialog, filtered by Job Number (via linelist_uploads) + Unit Number.
const LinelistLine = pimsSequelize.define(
  "LinelistLine",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true },
    upload_id: { type: DataTypes.INTEGER },
    pid_no: { type: DataTypes.STRING },
    service: { type: DataTypes.STRING },
    unit_no: { type: DataTypes.STRING },
    line_no: { type: DataTypes.STRING },
    line_size: { type: DataTypes.STRING },
    line_class: { type: DataTypes.STRING },
  },
  { tableName: "linelist_lines", timestamps: false }
);

module.exports = LinelistLine;
