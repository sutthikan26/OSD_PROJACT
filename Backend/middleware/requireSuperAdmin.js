const { getRole } = require("../utils/auth");

function requireSuperAdmin(req, res, next) {
  if (getRole(req) !== "admin") {
    return res.status(403).json({ message: "Forbidden: Admin only" });
  }
  next();
}

module.exports = requireSuperAdmin;
