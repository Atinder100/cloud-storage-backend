const express = require("express");

const { uploadFile, getFiles, renameFile, deleteFile } = require("../controllers/fileController");
const authenticateToken = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

const router = express.Router();

router.post(
  "/upload",
  authenticateToken,
  upload.single("file"),
  uploadFile
);

router.get("/", authenticateToken, getFiles);

router.patch("/:id", authenticateToken, renameFile);

router.delete("/:id", authenticateToken, deleteFile);

module.exports = router;