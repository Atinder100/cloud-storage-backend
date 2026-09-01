const express = require("express");

const { uploadFile, getFiles, renameFile, deleteFile, getSignedUrl, searchFiles } = require("../controllers/fileController");
const authenticateToken = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");
const checkPermission = require("../middleware/permissionMiddleware");

const router = express.Router();


router.get("/", authenticateToken, getFiles);


router.get("/search", authenticateToken, searchFiles);


router.post(
  "/upload",
  authenticateToken,
  upload.single("file"),
  uploadFile
);


router.get(
  "/:id/signed-url",
  authenticateToken,
  checkPermission(["owner", "editor", "viewer"]),
  getSignedUrl
);


router.patch(
  "/:id",
  authenticateToken,
  checkPermission(["owner", "editor"]),
  renameFile
);


router.delete(
  "/:id",
  authenticateToken,
  checkPermission(["owner", "editor"]),
  deleteFile
);

module.exports = router;