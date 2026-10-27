const asyncHandler = require("../utils/asyncHandler");
const authService = require("../services/auth.service");

const login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.body);
  res.status(200).json({ success: true, data: result });
});

const me = asyncHandler(async (req, res) => {
  res.status(200).json({ success: true, data: req.user });
});

module.exports = { login, me };
