const express = require("express");
const adminController = require("../controllers/admin.controller");
const { requireAuth } = require("../middleware/auth.middleware");

const router = express.Router();

router.use(requireAuth);

router.get("/", adminController.list);
router.post("/", adminController.add);
router.delete("/:employeeId", adminController.remove);

module.exports = router;
