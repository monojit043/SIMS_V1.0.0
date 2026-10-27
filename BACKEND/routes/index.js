const express = require("express");

const authRoutes = require("./auth.routes");
const pidRoutes = require("./pid.routes");
const lookupsRoutes = require("./lookups.routes");
const specialItemTagRoutes = require("./specialItemTag.routes");
const licensorDocumentRoutes = require("./licensorDocument.routes");
const st6ReportRoutes = require("./st6Report.routes");
const adminRoutes = require("./admin.routes");
const libraryTaskRoutes = require("./libraryTask.routes");

const router = express.Router();

router.get("/health", (req, res) => res.status(200).json({ success: true, message: "OK" }));

router.use("/auth", authRoutes);
router.use("/pid", pidRoutes);
router.use("/lookups", lookupsRoutes);
router.use("/special-item-tags", specialItemTagRoutes);
router.use("/licensor-documents", licensorDocumentRoutes);
router.use("/st6-reports", st6ReportRoutes);
router.use("/admins", adminRoutes);
router.use("/library-tasks", libraryTaskRoutes);

module.exports = router;
