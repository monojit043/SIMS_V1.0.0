const { DataTypes } = require("sequelize");
const { employeeSequelize } = require("../config/externalDb");

// Read-only mapping onto MASTER_EMPLOYEE_DB.employee_details — the single source of truth for
// login. We never write to this table from SIMS.
const EmployeeDetails = employeeSequelize.define(
  "EmployeeDetails",
  {
    employee_id: { type: DataTypes.STRING(20), primaryKey: true },
    name: { type: DataTypes.STRING(120), allowNull: false },
    password: { type: DataTypes.STRING(120), allowNull: false },
    is_hod: { type: DataTypes.BOOLEAN, allowNull: false },
    department: { type: DataTypes.STRING(80) },
    created_at: { type: DataTypes.DATE },
    updated_at: { type: DataTypes.DATE },
  },
  { tableName: "employee_details", timestamps: false }
);

module.exports = EmployeeDetails;
