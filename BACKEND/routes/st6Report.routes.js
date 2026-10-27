const express = require("express");
const st6ReportController = require("../controllers/st6Report.controller");
const { requireAuth } = require("../middleware/auth.middleware");
const { reportUpload } = require("../middleware/upload.middleware");

const router = express.Router();

router.use(requireAuth);

router.post("/", reportUpload.single("file"), st6ReportController.create);
router.get("/", st6ReportController.list);
router.delete("/:id", st6ReportController.remove);

module.exports = router;
