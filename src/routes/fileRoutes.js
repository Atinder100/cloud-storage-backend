const express = require("express");

const { uploadFile, getFiles, renameFile, deleteFile, getSignedUrl } = require("../controllers/fileController");
const authenticateToken = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");
const checkPermission = require("../middleware/permissionMiddleware");

const router = express.Router();

router.get("/", authenticateToken, getFiles);

router.post(
  "/upload",
  authenticateToken,
  upload.single("file"),
  uploadFile
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


router.get(
  "/:id/signed-url",
  authenticateToken,
  checkPermission(["owner", "editor", "viewer"]),
  getSignedUrl
);


module.exports = router;