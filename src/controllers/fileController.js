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

// Get user's files
const getFiles = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
        id,
        name,
        mime_type,
        size_bytes,
        storage_key,
        owner_id,
        folder_id,
        version_id,
        checksum,
        is_deleted,
        created_at,
        updated_at
       FROM files
       WHERE owner_id = $1
       AND is_deleted = false
       ORDER BY created_at DESC`,
      [req.user.id]
    );

    return res.status(200).json({
      files: result.rows,
    });
  } catch (error) {
    console.error("Get files error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

const renameFile = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        message: "File name is required",
      });
    }

    const result = await pool.query(
      `UPDATE files
       SET name = $1,
           updated_at = NOW()
       WHERE id = $2
       AND is_deleted = false
       RETURNING *`,
      [name.trim(), id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "File not found",
      });
    }

    return res.status(200).json({
      message: "File renamed successfully",
      file: result.rows[0],
    });
  } catch (error) {
    console.error("Rename file error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

const deleteFile = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE files
       SET is_deleted = true,
           updated_at = NOW()
       WHERE id = $1
       AND is_deleted = false
       RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "File not found",
      });
    }

    return res.status(200).json({
      message: "File moved to trash",
      file: result.rows[0],
    });
  } catch (error) {
    console.error("Delete file error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};


const getSignedUrl = async (req, res) => {
  try {
    const { id } = req.params;

    // Get file from database
    const fileResult = await pool.query(
      `SELECT
         id,
         name,
         mime_type,
         storage_key,
         owner_id,
         is_deleted
       FROM files
       WHERE id = $1
       AND is_deleted = false`,
      [id]
    );

    if (fileResult.rows.length === 0) {
      return res.status(404).json({
        message: "File not found",
      });
    }

    const file = fileResult.rows[0];

    // Generate signed URL
    const { data, error } = await supabase.storage
      .from(process.env.SUPABASE_BUCKET)
      .createSignedUrl(file.storage_key, 60 * 60);

    if (error) {
      console.error("Supabase signed URL error:", error);

      return res.status(500).json({
        message: "Failed to generate signed URL",
      });
    }

    return res.status(200).json({
      message: "Signed URL generated successfully",
      signedUrl: data.signedUrl,
      expiresIn: 3600,
      file: {
        id: file.id,
        name: file.name,
        mimeType: file.mime_type,
      },
    });
  } catch (error) {
    console.error("Get signed URL error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

module.exports = {
  uploadFile,
  getFiles,
  renameFile,
  deleteFile,
  getSignedUrl
};