const crypto = require("crypto");
const pool = require("../config/db");

// Create a shareable link
const createShareLink = async (req, res) => {
  try {
    const { resourceId, resourceType = "file", role = "viewer" } = req.body;

    if (!resourceId) {
      return res.status(400).json({
        message: "Resource ID is required",
      });
    }

    if (!["file", "folder"].includes(resourceType)) {
      return res.status(400).json({
        message: "Invalid resource type",
      });
    }

    if (!["viewer", "editor"].includes(role)) {
      return res.status(400).json({
        message: "Invalid role",
      });
    }

    // Verify that the authenticated user owns the resource
    const table = resourceType === "file" ? "files" : "folders";

    const resourceResult = await pool.query(
      `SELECT id
       FROM ${table}
       WHERE id = $1
       AND owner_id = $2
       AND is_deleted = false`,
      [resourceId, req.user.id]
    );

    if (resourceResult.rows.length === 0) {
      return res.status(404).json({
        message: `${resourceType} not found`,
      });
    }

    // Generate a unique token
    const token = crypto.randomBytes(32).toString("hex");

    const result = await pool.query(
      `INSERT INTO link_shares (
        resource_type,
        resource_id,
        token,
        role,
        created_by
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, resource_type, resource_id, token, role, expires_at, created_at`,
      [
        resourceType,
        resourceId,
        token,
        role,
        req.user.id,
      ]
    );

    const share = result.rows[0];

    return res.status(201).json({
      message: "Shareable link created successfully",
      share,
      shareUrl: `http://localhost:8080/api/shares/link/${share.token}`,
    });
  } catch (error) {
    console.error("Create share link error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

// Share resource with another user
const createUserShare = async (req, res) => {
  try {
    const {
      resourceId,
      resourceType = "file",
      granteeUserId,
      role = "viewer",
    } = req.body;

    if (!resourceId || !granteeUserId) {
      return res.status(400).json({
        message: "Resource ID and grantee user ID are required",
      });
    }

    if (!["file", "folder"].includes(resourceType)) {
      return res.status(400).json({
        message: "Invalid resource type",
      });
    }

    if (!["viewer", "editor"].includes(role)) {
      return res.status(400).json({
        message: "Invalid role",
      });
    }

    // Prevent sharing with yourself
    if (granteeUserId === req.user.id) {
      return res.status(400).json({
        message: "You cannot share a resource with yourself",
      });
    }

    const table = resourceType === "file" ? "files" : "folders";

    // Verify ownership
    const resourceResult = await pool.query(
      `SELECT id
       FROM ${table}
       WHERE id = $1
       AND owner_id = $2
       AND is_deleted = false`,
      [resourceId, req.user.id]
    );

    if (resourceResult.rows.length === 0) {
      return res.status(404).json({
        message: `${resourceType} not found`,
      });
    }

    // Verify target user exists
    const userResult = await pool.query(
      `SELECT id, name, email
       FROM users
       WHERE id = $1`,
      [granteeUserId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        message: "User to share with not found",
      });
    }

    // Create share
    const result = await pool.query(
  `INSERT INTO shares (
    resource_type,
    resource_id,
    grantee_user_id,
    role,
    created_by
  )
  VALUES ($1, $2, $3, $4, $5)
  ON CONFLICT (resource_type, resource_id, grantee_user_id)
  DO UPDATE SET
    role = EXCLUDED.role,
    created_by = EXCLUDED.created_by
  RETURNING *`,
  [
    resourceType,
    resourceId,
    granteeUserId,
    role,
    req.user.id,
  ]
);

    return res.status(201).json({
      message: "Resource shared successfully",
      share: result.rows[0],
      user: userResult.rows[0],
    });
  } catch (error) {
    console.error("Create user share error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

module.exports = {
  createShareLink,
  createUserShare,
};