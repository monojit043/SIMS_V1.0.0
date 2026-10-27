const Admin = require("../models/Admin");
const ApiError = require("../utils/ApiError");

async function isAdmin(employeeId) {
  if (!employeeId) return false;
  const row = await Admin.findOne({ where: { employeeId } });
  return !!row;
}

async function list() {
  return Admin.findAll({ order: [["createdAt", "ASC"]] });
}

async function add(employeeId, addedBy) {
  if (!employeeId) {
    throw new ApiError(400, "employeeId is required");
  }
  const [row] = await Admin.findOrCreate({
    where: { employeeId },
    defaults: { employeeId, addedBy },
  });
  return row;
}

async function remove(employeeId) {
  const row = await Admin.findOne({ where: { employeeId } });
  if (!row) {
    throw new ApiError(404, "This employee is not an admin");
  }
  await row.destroy();
}

module.exports = { isAdmin, list, add, remove };
