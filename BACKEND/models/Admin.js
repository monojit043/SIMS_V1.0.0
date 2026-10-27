const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

// A dedicated SIMS-only admin role — separate from MASTER_EMPLOYEE_DB's is_hod flag, since being
// a department head doesn't necessarily mean this person should manage 3D-library tasks (and
// vice versa). Membership in this table is the entire "is this employee an admin" check.
const Admin = sequelize.define(
  "Admin",
  {
    // employee_id from MASTER_EMPLOYEE_DB (a different database — no cross-database FK possible).
    employeeId: { type: DataTypes.STRING(20), allowNull: false, unique: true },
    addedBy: { type: DataTypes.STRING(20) },
  },
  { tableName: "admins" }
);

module.exports = Admin;
