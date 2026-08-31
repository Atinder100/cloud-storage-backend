const pool = require("../config/db");

// Create folder
const createFolder = async (req, res) => {
  try {
    const { name, parentId } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        message: "Folder name is required",
      });
    }

    // Verify parent folder if provided
    if (parentId) {
      const parentFolder = await pool.query(
        `SELECT id
         FROM folders
         WHERE id = $1
         AND owner_id = $2
         AND is_deleted = false`,
        [parentId, req.user.id]
      );

      if (parentFolder.rows.length === 0) {
        return res.status(404).json({
          message: "Parent folder not found",
        });
      }
    }

    const result = await pool.query(
      `INSERT INTO folders (
        name,
        owner_id,
        parent_id
      )
      VALUES ($1, $2, $3)
      RETURNING *`,
      [name.trim(), req.user.id, parentId || null]
    );

    return res.status(201).json({
      message: "Folder created successfully",
      folder: result.rows[0],
    });
  } catch (error) {
    console.error("Create folder error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

// Get folders
const getFolders = async (req, res) => {
  try {
    const { parentId } = req.query;

    let query;
    let values;

    // Get folders inside a specific parent folder
    if (parentId) {
      query = `
        SELECT *
        FROM folders
        WHERE owner_id = $1
        AND parent_id = $2
        AND is_deleted = false
        ORDER BY created_at DESC
      `;

      values = [req.user.id, parentId];
    } else {
      // Get root-level folders
      query = `
        SELECT *
        FROM folders
        WHERE owner_id = $1
        AND parent_id IS NULL
        AND is_deleted = false
        ORDER BY created_at DESC
      `;

      values = [req.user.id];
    }

    const result = await pool.query(query, values);

    return res.status(200).json({
      folders: result.rows,
    });
  } catch (error) {
    console.error("Get folders error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

// Rename folder
const renameFolder = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        message: "Folder name is required",
      });
    }

    const result = await pool.query(
      `UPDATE folders
       SET name = $1,
           updated_at = NOW()
       WHERE id = $2
       AND owner_id = $3
       AND is_deleted = false
       RETURNING *`,
      [name.trim(), id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Folder not found",
      });
    }

    return res.status(200).json({
      message: "Folder renamed successfully",
      folder: result.rows[0],
    });
  } catch (error) {
    console.error("Rename folder error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

// Soft delete folder
const deleteFolder = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE folders
       SET is_deleted = true,
           updated_at = NOW()
       WHERE id = $1
       AND owner_id = $2
       AND is_deleted = false
       RETURNING *`,
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Folder not found",
      });
    }

    return res.status(200).json({
      message: "Folder moved to trash",
      folder: result.rows[0],
    });
  } catch (error) {
    console.error("Delete folder error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

module.exports = {
  createFolder,
  getFolders,
  renameFolder,
  deleteFolder,
};
