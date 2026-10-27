const express = require("express");
const licensorDocumentController = require("../controllers/licensorDocument.controller");
const { requireAuth } = require("../middleware/auth.middleware");
const { licensorUpload } = require("../middleware/upload.middleware");

const router = express.Router();

router.use(requireAuth);

router.post("/", licensorUpload.single("file"), licensorDocumentController.create);
router.get("/", licensorDocumentController.list);
router.delete("/:id", licensorDocumentController.remove);

module.exports = router;
