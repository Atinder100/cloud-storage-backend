const pool = require("../config/db");

// Check user's permission for a resource
const checkPermission = (allowedRoles = []) => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params.resourceId || req.params.id;
      const resourceType = req.params.resourceType || "file";

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

      const table = resourceType === "file" ? "files" : "folders";

      // First check whether the user owns the resource
      const ownerResult = await pool.query(
        `SELECT id
         FROM ${table}
         WHERE id = $1
         AND owner_id = $2
         AND is_deleted = false`,
        [resourceId, req.user.id]
      );

      if (ownerResult.rows.length > 0) {
        if (allowedRoles.includes("owner")) {
          req.permissionRole = "owner";
          return next();
        }

        return res.status(403).json({
          message: "Owner permission is not allowed for this operation",
        });
      }

      // If not owner, check shared permission
      const shareResult = await pool.query(
        `SELECT role
         FROM shares
         WHERE resource_type = $1
         AND resource_id = $2
         AND grantee_user_id = $3`,
        [resourceType, resourceId, req.user.id]
      );

      if (shareResult.rows.length === 0) {
        return res.status(403).json({
          message: "You do not have permission to access this resource",
        });
      }

      const role = shareResult.rows[0].role;

      if (!allowedRoles.includes(role)) {
        return res.status(403).json({
          message: "Insufficient permissions",
        });
      }

      req.permissionRole = role;

      next();
    } catch (error) {
      console.error("Permission check error:", error);

      return res.status(500).json({
        message: "Internal server error",
      });
    }
  };
};

module.exports = checkPermission;