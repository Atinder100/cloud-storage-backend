const express = require("express");

const {
  createShareLink,
  createUserShare
} = require("../controllers/shareController");

const authenticateToken = require("../middleware/authMiddleware");

const router = express.Router();

// Create shareable link
router.post("/link", authenticateToken, createShareLink);

router.post("/", authenticateToken, createUserShare);

module.exports = router;