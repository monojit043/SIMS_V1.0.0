const express = require("express");
const pidController = require("../controllers/pid.controller");
const { requireAuth } = require("../middleware/auth.middleware");
const { pidUpload } = require("../middleware/upload.middleware");

const router = express.Router();

router.use(requireAuth);

router.post("/import-from-epulse", pidController.importFromEpulse);
router.post("/", pidController.create);   // refused: P&IDs come from ePULSE
router.get("/", pidController.list);
router.get("/:id", pidController.getById);
router.put("/:id", pidUpload.single("file"), pidController.update);
router.delete("/:id", pidController.remove);

module.exports = router;
