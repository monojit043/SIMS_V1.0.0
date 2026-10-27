const asyncHandler = require("../utils/asyncHandler");
const authService = require("../services/auth.service");
const sso = require("../utils/sso");

// Sign-in also sets the shared eil_sso cookie, so ePULSE / MRCS / SSMS / IPMCS open signed in too
const login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.body);
  sso.setCookie(res, result.user.id);
  res.status(200).json({ success: true, data: result });
});

// Already signed in to another module (eil_sso cookie) → a SIMS session without a password
const ssoLogin = asyncHandler(async (req, res) => {
  const result = await authService.loginFromSso(sso.currentUserId(req));
  res.status(200).json({ success: true, data: result });
});

// Signing out of SIMS signs out of every module (one shared cookie)
const logout = (req, res) => {
  sso.clearCookie(res);
  res.status(200).json({ success: true });
};

const me = asyncHandler(async (req, res) => {
  res.status(200).json({ success: true, data: req.user });
});

module.exports = { login, ssoLogin, logout, me };
