const express = require("express");
const pidController = require("../controllers/pid.controller");
const { requireAuth } = require("../middleware/auth.middleware");
const { pidUpload } = require("../middleware/upload.middleware");

const router = express.Router();

router.use(requireAuth);

router.post("/import-from-pims", pidController.importFromPims);
router.post("/", pidUpload.single("file"), pidController.create);
router.get("/", pidController.list);
router.get("/:id", pidController.getById);
router.put("/:id", pidUpload.single("file"), pidController.update);
router.delete("/:id", pidController.remove);

module.exports = router;
