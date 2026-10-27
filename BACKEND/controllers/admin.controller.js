const asyncHandler = require("../utils/asyncHandler");
const adminService = require("../services/admin.service");
const ApiError = require("../utils/ApiError");

const list = asyncHandler(async (req, res) => {
  const rows = await adminService.list();
  res.status(200).json({ success: true, data: rows });
});

const add = asyncHandler(async (req, res) => {
  if (!req.user.isAdmin) {
    throw new ApiError(403, "Only admins can add other admins");
  }
  const row = await adminService.add(req.body.employeeId, req.user.id);
  res.status(201).json({ success: true, data: row });
});

const remove = asyncHandler(async (req, res) => {
  if (!req.user.isAdmin) {
    throw new ApiError(403, "Only admins can remove admins");
  }
  await adminService.remove(req.params.employeeId);
  res.status(204).send();
});

module.exports = { list, add, remove };
