const express = require("express");
const libraryTaskController = require("../controllers/libraryTask.controller");
const { requireAuth } = require("../middleware/auth.middleware");

const router = express.Router();

router.use(requireAuth);

router.get("/", libraryTaskController.list);
router.post("/backfill", libraryTaskController.backfill);
router.post("/:id/complete", libraryTaskController.complete);
router.post("/:id/delegate", libraryTaskController.delegate);

module.exports = router;
