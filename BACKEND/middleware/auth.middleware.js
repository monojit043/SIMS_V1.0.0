const jwt = require("jsonwebtoken");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const EmployeeDetails = require("../models/EmployeeDetails");
const { toSafeUser } = require("../services/auth.service");

const requireAuth = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    throw new ApiError(401, "Authentication required");
  }

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    throw new ApiError(401, "Invalid or expired token");
  }

  const employee = await EmployeeDetails.findByPk(payload.sub);
  if (!employee) {
    throw new ApiError(401, "User no longer exists");
  }

  req.user = await toSafeUser(employee);
  next();
});

module.exports = { requireAuth };
