const express = require("express");

const {
  createFolder,
  getFolders,
  renameFolder,
  deleteFolder,
} = require("../controllers/folderController");

const authenticateToken = require("../middleware/authMiddleware");

const router = express.Router();

 
router.get("/", authenticateToken, getFolders);

router.post("/", authenticateToken, createFolder);

router.patch("/:id", authenticateToken, renameFolder);

router.delete("/:id", authenticateToken, deleteFolder);

module.exports = router;