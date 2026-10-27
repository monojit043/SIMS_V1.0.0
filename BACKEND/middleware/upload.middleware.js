const path = require("path");
const fs = require("fs");
const multer = require("multer");
const ApiError = require("../utils/ApiError");

function makeStorage(subdir) {
  const dest = path.join(__dirname, "..", "uploads", subdir);
  fs.mkdirSync(dest, { recursive: true });

  return multer.diskStorage({
    destination: (req, file, cb) => cb(null, dest),
    filename: (req, file, cb) => {
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      cb(null, `${unique}${path.extname(file.originalname)}`);
    },
  });
}

const REPORT_EXTENSIONS = [".xlsx", ".xls", ".csv", ".pdf"];
const PID_EXTENSIONS = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".pdf"];
const LICENSOR_EXTENSIONS = [".pdf", ".doc", ".docx", ".xls", ".xlsx", ".csv", ".png", ".jpg", ".jpeg"];

function extensionFilter(allowedExtensions) {
  return (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowedExtensions.includes(ext)) {
      cb(new ApiError(400, `Unsupported file type "${ext}". Allowed: ${allowedExtensions.join(", ")}`));
      return;
    }
    cb(null, true);
  };
}

const reportUpload = multer({
  storage: makeStorage("reports"),
  fileFilter: extensionFilter(REPORT_EXTENSIONS),
  limits: { fileSize: 25 * 1024 * 1024 },
});

const pidUpload = multer({
  storage: makeStorage("pid"),
  fileFilter: extensionFilter(PID_EXTENSIONS),
  limits: { fileSize: 50 * 1024 * 1024 },
});

const licensorUpload = multer({
  storage: makeStorage("licensor"),
  fileFilter: extensionFilter(LICENSOR_EXTENSIONS),
  limits: { fileSize: 50 * 1024 * 1024 },
});

module.exports = { reportUpload, pidUpload, licensorUpload };
