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

const COOKIE_NAME = "authToken";

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: "/",
};

// Email/password authentication
router.post("/signup", signup);
router.post("/login", login);

// Get currently authenticated user
router.get("/me", authenticateToken, (req, res) => {
  res.json({
    message: "You are authenticated",
    user: req.user,
  });
});

// Logout
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

    // Store JWT in the same httpOnly cookie
    // used by email/password authentication.
    res.cookie(COOKIE_NAME, token, cookieOptions);

    // Do not send the JWT to the frontend.
    // Redirect the browser back to the frontend.
    res.redirect(`${process.env.FRONTEND_URL}/login?oauth=success`);
  }
);

// Google authentication failure
router.get("/google/failure", (req, res) => {
  res.status(401).json({
    message: "Google authentication failed",
  });
});

module.exports = router;