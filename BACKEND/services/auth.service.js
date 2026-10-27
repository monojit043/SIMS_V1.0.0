const jwt = require("jsonwebtoken");
const EmployeeDetails = require("../models/EmployeeDetails");
const adminService = require("./admin.service");
const ApiError = require("../utils/ApiError");

function signToken(employee) {
  return jwt.sign({ sub: employee.employee_id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "8h",
  });
}

async function toSafeUser(employee) {
  return {
    id: employee.employee_id,
    username: employee.employee_id,
    name: employee.name,
    department: employee.department,
    isHod: employee.is_hod,
    isAdmin: await adminService.isAdmin(employee.employee_id),
  };
}

async function login({ username, password }) {
  if (!username || !password) {
    throw new ApiError(400, "Username and password are required");
  }

  const employee = await EmployeeDetails.findByPk(username.trim());
  if (!employee) {
    throw new ApiError(401, "Invalid username or password");
  }

  // employee_details stores passwords in plain text (not hashed) — matching the source system's
  // own format is the only option here, since we don't control that table.
  if (employee.password !== password) {
    throw new ApiError(401, "Invalid username or password");
  }

  return { user: await toSafeUser(employee), token: signToken(employee) };
}

module.exports = { login, toSafeUser };
