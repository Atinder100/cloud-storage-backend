const express = require("express");

const { uploadFile } = require("../controllers/fileController");
const authenticateToken = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

const router = express.Router();

router.post(
  "/upload",
  authenticateToken,
  upload.single("file"),
  uploadFile
);

module.exports = router;