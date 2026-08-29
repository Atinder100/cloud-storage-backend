const express = require("express");
const jwt = require("jsonwebtoken");

const {
  signup,
  login,
  logout,
} = require("../controllers/authController");

const authenticateToken = require("../middleware/authMiddleware");
const passport = require("../config/passport");

const router = express.Router();

router.post("/signup", signup);

router.post("/login", login);

router.get("/me", authenticateToken, (req, res) => {
  res.json({
    message: "You are authenticated",
    user: req.user,
  });
});

router.post("/logout", authenticateToken, logout);

// Start Google OAuth
router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
  })
);

// Google OAuth callback
router.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: "/api/auth/google/failure",
  }),
  (req, res) => {
    const token = jwt.sign(
      {
        userId: req.user.id,
        email: req.user.email,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    res.json({
      message: "Google authentication successful",
      user: req.user,
      token,
    });
  }
);

// Google authentication failure
router.get("/google/failure", (req, res) => {
  res.status(401).json({
    message: "Google authentication failed",
  });
});

module.exports = router;