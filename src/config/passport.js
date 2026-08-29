const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const pool = require("./db");

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;

        if (!email) {
          return done(null, false, {
            message: "Google account does not have an email address",
          });
        }

        const name = profile.displayName || "Google User";
        const imageUrl = profile.photos?.[0]?.value || null;

        // Check whether the user already exists
        const existingUser = await pool.query(
          "SELECT id, name, email, image_url FROM users WHERE email = $1",
          [email.toLowerCase()]
        );

        if (existingUser.rows.length > 0) {
          return done(null, existingUser.rows[0]);
        }

        // Create a new user
        const result = await pool.query(
          `INSERT INTO users (name, email, image_url)
           VALUES ($1, $2, $3)
           RETURNING id, name, email, image_url, created_at`,
          [name, email.toLowerCase(), imageUrl]
        );

        return done(null, result.rows[0]);
      } catch (error) {
        console.error("Google OAuth error:", error);
        return done(error, null);
      }
    }
  )
);

module.exports = passport;