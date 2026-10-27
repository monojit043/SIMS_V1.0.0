const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

const St6Report = sequelize.define(
  "St6Report",
  {
    jobNumber: { type: DataTypes.STRING, allowNull: false },
    unitNumber: { type: DataTypes.STRING, allowNull: false },
    originalName: { type: DataTypes.STRING, allowNull: false },
    storedFileName: { type: DataTypes.STRING, allowNull: false },
    filePath: { type: DataTypes.STRING, allowNull: false },
    mimeType: { type: DataTypes.STRING },
    size: { type: DataTypes.INTEGER },
    // employee_id from MASTER_EMPLOYEE_DB (a different database — no cross-database FK possible).
    uploadedBy: { type: DataTypes.STRING(20) },
  },
  { tableName: "st6_reports" }
);

module.exports = St6Report;
