const express = require("express");
const specialItemTagController = require("../controllers/specialItemTag.controller");
const { requireAuth } = require("../middleware/auth.middleware");

const router = express.Router();

router.use(requireAuth);

router.post("/sync", specialItemTagController.sync);
router.get("/", specialItemTagController.list);
router.delete("/:id", specialItemTagController.remove);

module.exports = router;
