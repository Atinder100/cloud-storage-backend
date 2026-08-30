const { randomUUID } = require("crypto");
const path = require("path");

const supabase = require("../config/supabase");
const pool = require("../config/db");

const uploadFile = async (req, res) => {
  try {
    // Check if a file was provided
    if (!req.file) {
      return res.status(400).json({
        message: "No file uploaded",
      });
    }

    const file = req.file;
    const fileExtension = path.extname(file.originalname);

    // Generate a unique storage filename
    const storageFileName = `${randomUUID()}${fileExtension}`;

    // Upload file to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from(process.env.SUPABASE_BUCKET)
      .upload(storageFileName, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (uploadError) {
      console.error("Supabase upload error:", uploadError);

      return res.status(500).json({
        message: "Failed to upload file to storage",
      });
    }

    // Save file metadata in PostgreSQL
    const result = await pool.query(
  `INSERT INTO files (
    name,
    mime_type,
    size_bytes,
    storage_key,
    owner_id
  )
  VALUES ($1, $2, $3, $4, $5)
  RETURNING *`,
  [
    file.originalname,
    file.mimetype,
    file.size,
    storageFileName,
    req.user.id,
  ]
);
    return res.status(201).json({
      message: "File uploaded successfully",
      file: result.rows[0],
    });
  } catch (error) {
    console.error("File upload error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

module.exports = {
  uploadFile,
};