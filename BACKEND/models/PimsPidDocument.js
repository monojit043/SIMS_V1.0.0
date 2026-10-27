const { DataTypes } = require("sequelize");
const { pimsSequelize } = require("../config/externalDb");

// Read-only mapping onto PIMS_SQL.pid_documents — the actual uploaded file revisions for each
// pid_master_index entry. Named "Pims" to avoid confusion with SIMS's own PidDocument model
// (same table name, entirely different database/connection). We never write to this table.
const PimsPidDocument = pimsSequelize.define(
  "PimsPidDocument",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true },
    master_index_id: { type: DataTypes.INTEGER },
    rev_label: { type: DataTypes.STRING },
    rev_sort_key: { type: DataTypes.INTEGER },
    file_name: { type: DataTypes.STRING },
    file_path: { type: DataTypes.STRING },
    file_hash: { type: DataTypes.STRING },
    status: { type: DataTypes.STRING },
    superseded_by: { type: DataTypes.INTEGER },
    uploaded_by: { type: DataTypes.STRING },
    uploaded_at: { type: DataTypes.DATE },
  },
  { tableName: "pid_documents", timestamps: false }
);

module.exports = PimsPidDocument;
