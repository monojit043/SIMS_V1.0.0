const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");
const SpecialItemTag = require("./SpecialItemTag");

// One task per newly-tagged special item, raised for admins to add that item into the 3D model
// library (done outside SIMS, e.g. in S3D — SIMS only tracks whether that's been done yet).
// specialItemTagId is a soft reference (not a hard FK requiring cascade): if the highlight is
// later removed from the P&ID, the underlying real-world item may still need modeling, so the
// task should survive that — key display fields are denormalized here for the same reason.
const LibraryTask = sequelize.define(
  "LibraryTask",
  {
    specialItemTagId: {
      type: DataTypes.INTEGER,
      references: { model: SpecialItemTag, key: "id" },
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
      allowNull: true,
    },
    tagNumber: { type: DataTypes.STRING, defaultValue: "" },
    itemName: { type: DataTypes.STRING, defaultValue: "" },
    jobNumber: { type: DataTypes.STRING, defaultValue: "" },
    unitNumber: { type: DataTypes.STRING, defaultValue: "" },
    status: {
      type: DataTypes.STRING,
      defaultValue: "Pending",
      validate: { isIn: [["Pending", "Done"]] },
    },
    // employee_id values from MASTER_EMPLOYEE_DB (a different database — no cross-database FK).
    createdBy: { type: DataTypes.STRING(20) },
    completedBy: { type: DataTypes.STRING(20), allowNull: true },
    completedAt: { type: DataTypes.DATE, allowNull: true },
    // An admin can delegate the actual 3D-modeling work to a specific employee (who need not be
    // an admin themselves) — that person can then mark the task done, same as any admin can.
    assignedTo: { type: DataTypes.STRING(20), allowNull: true },
    delegatedBy: { type: DataTypes.STRING(20), allowNull: true },
    delegatedAt: { type: DataTypes.DATE, allowNull: true },
  },
  {
    tableName: "library_tasks",
    indexes: [{ fields: ["status"] }, { fields: ["specialItemTagId"] }],
  }
);

module.exports = LibraryTask;
