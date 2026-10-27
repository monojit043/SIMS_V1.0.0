const { DataTypes } = require("sequelize");
const { pimsSequelize } = require("../config/externalDb");

// Read-only mapping onto PIMS_SQL.user_role_assignments — drives each user's Job Number /
// Unit Number options. We never write to this table from SIMS.
const UserRoleAssignment = pimsSequelize.define(
  "UserRoleAssignment",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true },
    user_id: { type: DataTypes.STRING(20) },
    project_id: { type: DataTypes.STRING(50) },
    unit_no: { type: DataTypes.STRING(50), allowNull: false },
    role: { type: DataTypes.STRING(50), allowNull: false },
  },
  { tableName: "user_role_assignments", timestamps: false }
);

module.exports = UserRoleAssignment;
