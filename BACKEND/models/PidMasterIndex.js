const { DataTypes } = require("sequelize");
const { pimsSequelize } = require("../config/externalDb");

// Read-only mapping onto PIMS_SQL.pid_master_index — every P&ID registered for a job/unit,
// shown on the Job Form once the user picks a Job Number + Unit Number. We never write to this
// table from SIMS.
const PidMasterIndex = pimsSequelize.define(
  "PidMasterIndex",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true },
    job_no: { type: DataTypes.STRING },
    unit_no: { type: DataTypes.STRING },
    zone: { type: DataTypes.STRING },
    pid_name: { type: DataTypes.STRING },
    status: { type: DataTypes.STRING },
    created_by: { type: DataTypes.STRING },
    created_at: { type: DataTypes.DATE },
    retired_by: { type: DataTypes.STRING },
    retired_at: { type: DataTypes.DATE },
    retire_reason: { type: DataTypes.TEXT },
  },
  { tableName: "pid_master_index", timestamps: false }
);

module.exports = PidMasterIndex;
