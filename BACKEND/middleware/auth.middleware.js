const jwt = require("jsonwebtoken");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const { findActiveEmployee, toSafeUser, NO_ACCESS } = require("../services/auth.service");
const access = require("../services/access.service");

// Every request: a valid SIMS token, an employee still active on PC-2, and a place on
// at least one IPMCS team — all read live, so removals take effect immediately.
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

  const employee = await findActiveEmployee(payload.sub);
  if (!employee) {
    throw new ApiError(401, "User no longer exists or is inactive");
  }

  req.user = await toSafeUser(employee);
  if (!req.user.access.length) throw new ApiError(403, NO_ACCESS);
  next();
});

// The job + unit a request works on must be one of the user's IPMCS teams
function assertUnit(user, jobNo, unitNo) {
  if (!access.canOpen(user.access, jobNo, unitNo)) {
    throw new ApiError(403, `You are not on the IPMCS team of ${jobNo || "?"} / ${unitNo || "?"}`);
  }
}

module.exports = { requireAuth, assertUnit };
