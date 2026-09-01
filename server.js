const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const pool = require("./src/config/db");
const authRoutes = require("./src/routes/authRoutes");
const passport = require("./src/config/passport");
const fileRoutes = require("./src/routes/fileRoutes");
const folderRoutes = require("./src/routes/folderRoutes");
const shareRoutes = require("./src/routes/shareRoutes");

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(passport.initialize());
app.use("/api/auth", authRoutes);
app.use("/api/files", fileRoutes);
app.use("/api/folders", folderRoutes);
app.use("/api/shares", shareRoutes);

app.get("/", (req, res) => {
  res.json({
    message: "Cloud Storage API is running",
  });
});

app.get("/api/health", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");

    res.json({
      status: "ok",
      database: "connected",
      time: result.rows[0].now,
    });
  } catch (error) {
    console.error("Database connection error:", error);

    res.status(500).json({
      status: "error",
      database: "disconnected",
    });
  }
});

const PORT = process.env.PORT || 8080;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;