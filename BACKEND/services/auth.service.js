const jwt = require("jsonwebtoken");
const { queryEpulse } = require("../config/externalDb");
const access = require("./access.service");
const ApiError = require("../utils/ApiError");

const NO_ACCESS = "You are not on the IPMCS team of any job / unit — ask its GL or Material Lead to add you in IPMCS.";

// Credentials live on PC-2 (eil_employees.users), read live through ePULSE's pc2_emp.users
// link. Passwords there are plain text (not our schema to change), so this is a direct
// comparison. Deactivated employees can't log in.
async function findActiveEmployee(employeeId, password) {
  const params = [String(employeeId || "").trim()];
  if (password !== undefined) params.push(password);
  const { rows } = await queryEpulse(
    `SELECT id, name, department, is_hod FROM pc2_emp.users
     WHERE upper(id) = upper($1) AND is_active = 1 ${password === undefined ? "" : "AND password_hash = $2"}`,
    params
  );
  return rows[0] || null;
}

function signToken(employeeId) {
  return jwt.sign({ sub: employeeId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "8h",
  });
}

// The user as the pages see it; access (jobs + units + role) is read live every time
async function toSafeUser(employee) {
  const units = await access.getAccess(employee.id);
  return {
    id: employee.id,
    username: employee.id,
    name: employee.name,
    department: employee.department,
    isHod: employee.is_hod === 1,
    isAdmin: access.isAdmin(units),
    access: units,
  };
}

async function sessionFor(employee) {
  const user = await toSafeUser(employee);
  if (!user.access.length) throw new ApiError(403, NO_ACCESS);
  return { user, token: signToken(employee.id) };
}

async function login({ username, password }) {
  if (!username || !password) {
    throw new ApiError(400, "Username and password are required");
  }
  const employee = await findActiveEmployee(username, password);
  if (!employee) {
    throw new ApiError(401, "Invalid username or password");
  }
  return sessionFor(employee);
}

// Single sign-on: the eil_sso cookie (set by ePULSE, MRCS, SSMS, IPMCS or SIMS) says who is
// signed in; the employee must still be active on PC-2 and on an IPMCS team.
async function loginFromSso(employeeId) {
  const employee = employeeId ? await findActiveEmployee(employeeId) : null;
  if (!employee) throw new ApiError(401, "Not signed in");
  return sessionFor(employee);
}

module.exports = { login, loginFromSso, findActiveEmployee, toSafeUser, NO_ACCESS };
