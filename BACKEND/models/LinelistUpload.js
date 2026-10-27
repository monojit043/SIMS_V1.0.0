const { DataTypes } = require("sequelize");
const { pimsSequelize } = require("../config/externalDb");

// Read-only mapping onto PIMS_SQL.linelist_uploads — one row per line-list file uploaded for a
// job. linelist_lines.upload_id points here; job_no only lives on this table, not on the lines
// themselves, so filtering lines by job requires joining through this.
const LinelistUpload = pimsSequelize.define(
  "LinelistUpload",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true },
    job_no: { type: DataTypes.STRING },
    rev_no: { type: DataTypes.INTEGER },
    is_latest: { type: DataTypes.BOOLEAN },
    row_count: { type: DataTypes.INTEGER },
  },
  { tableName: "linelist_uploads", timestamps: false }
);

module.exports = LinelistUpload;
