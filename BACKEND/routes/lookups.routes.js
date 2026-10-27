const express = require("express");
const lookupsController = require("../controllers/lookups.controller");
const { requireAuth } = require("../middleware/auth.middleware");

const router = express.Router();

router.get("/", lookupsController.getAll);
router.get("/my-assignments", requireAuth, lookupsController.getMyAssignments);
router.get("/pid-master-index", requireAuth, lookupsController.getPidMasterIndex);
router.get("/line-numbers", requireAuth, lookupsController.getLineNumbers);

module.exports = router;
