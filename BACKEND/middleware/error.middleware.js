const ApiError = require("../utils/ApiError");

function notFound(req, res, next) {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal server error";

  if (err.name === "SequelizeValidationError") {
    statusCode = 400;
    message = err.errors.map((e) => e.message).join(", ");
  } else if (err.name === "SequelizeUniqueConstraintError") {
    statusCode = 409;
    const field = err.errors?.[0]?.path;
    message = field ? `${field} already exists` : "Duplicate value";
  } else if (err.name === "SequelizeForeignKeyConstraintError") {
    statusCode = 400;
    message = "Referenced record does not exist";
  } else if (err.name === "SequelizeDatabaseError") {
    statusCode = 400;
    message = "Invalid request data";
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === "development" ? { stack: err.stack } : {}),
  });
}

module.exports = { notFound, errorHandler };
