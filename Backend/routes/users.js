const express = require("express");

const { query } = require("../db");
const requireSuperAdmin = require("../middleware/requireSuperAdmin");
const { sanitizeUser } = require("../utils/auth");
const { emitInvalidation } = require("../utils/realtime");

const router = express.Router();

router.get("/users", requireSuperAdmin, async (req, res) => {
  try {
    const rows = await query(
      "SELECT id, full_name AS name, username, role, must_change_password AS mustChangePassword FROM users ORDER BY full_name",
    );
    res.json({ items: rows.map(sanitizeUser) });
  } catch (error) {
    res.status(500).json({ message: "Database error" });
  }
});

router.post("/users", requireSuperAdmin, async (req, res) => {
  try {
    const { name, username, password, role } = req.body;

    const normalizedName = (name || "").toString().trim();
    const normalizedUsername = (username || "").toString().trim();
    const normalizedPassword = (password || "").toString();
    const normalizedRole = role === "admin" ? "admin" : "user";
    const idPrefix = normalizedRole === "admin" ? "u-admin-" : "u-user-";

    if (!normalizedName || !normalizedUsername || !normalizedPassword) {
      return res.status(400).json({
        message: "name, username and password are required",
      });
    }

    const existing = await query(
      "SELECT id FROM users WHERE LOWER(username) = LOWER(?)",
      [normalizedUsername],
    );

    if (existing.length > 0) {
      return res.status(409).json({ message: "Username already exists" });
    }

    const lastIdRows = await query(
      "SELECT id FROM users WHERE id LIKE ? ORDER BY CAST(SUBSTRING_INDEX(id, '-', -1) AS UNSIGNED) DESC LIMIT 1",
      [`${idPrefix}%`],
    );

    let nextNumber = 1;
    if (lastIdRows.length > 0) {
      const match = String(lastIdRows[0].id || "").match(/(\d+)$/);
      if (match) {
        nextNumber = Number(match[1]) + 1;
      }
    }

    const newId = `${idPrefix}${nextNumber}`;

    const result = await query(
      "INSERT INTO users (id, full_name, username, password, role) VALUES (?, ?, ?, ?, ?)",
      [newId, normalizedName, normalizedUsername, normalizedPassword, normalizedRole],
    );

    const created = {
      id: newId,
      name: normalizedName,
      username: normalizedUsername,
      role: normalizedRole,
    };

    res.status(201).json({
      message: "User created",
      item: sanitizeUser(created),
    });
    emitInvalidation(
      ["users", "queue", "maintenance", "dashboard"],
      "user.created",
    );
  } catch (error) {
    res.status(500).json({ message: "Database error" });
  }
});

router.delete("/users/:id", requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = String(req.headers["x-user-id"] || "");

    if (!id) {
      return res.status(400).json({ message: "user id is required" });
    }

    if (id === currentUserId) {
      return res
        .status(400)
        .json({ message: "You cannot delete your own account" });
    }

    const existing = await query(
      "SELECT id, username, full_name AS fullName FROM users WHERE id = ?",
      [id],
    );
    if (existing.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const targetUser = existing[0];

    await query("DELETE FROM users WHERE id = ?", [id]);

    // Keep staff queue in sync after user deletion.
    // Match by queue id convention and by display/username fallback.
    const mappedStaffId = id.startsWith("u-") ? `s-${id.slice(2)}` : null;
    await query("DELETE FROM staff_queue WHERE id = ?", [id]);
    if (mappedStaffId) {
      await query("DELETE FROM staff_queue WHERE id = ?", [mappedStaffId]);
    }
    await query(
      "DELETE FROM staff_queue WHERE LOWER(TRIM(name)) IN (LOWER(TRIM(?)), LOWER(TRIM(?)))",
      [targetUser.username || "", targetUser.fullName || ""],
    );

    emitInvalidation(
      ["users", "queue", "maintenance", "dashboard"],
      "user.deleted",
    );

    res.json({ message: "User deleted" });
  } catch (error) {
    res.status(500).json({ message: "Database error" });
  }
});

router.patch("/users/:id", requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    const normalizedRole = role === "admin" ? "admin" : "user";

    const existing = await query("SELECT id FROM users WHERE id = ?", [id]);
    if (existing.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    await query("UPDATE users SET role = ? WHERE id = ?", [normalizedRole, id]);

    emitInvalidation(["users", "queue"], "user.updated");
    res.json({ message: "User updated" });
  } catch (error) {
    res.status(500).json({ message: "Database error" });
  }
});

router.post("/users/:id/reset-password", requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    const normalizedPassword = (newPassword || "").toString();
    if (!normalizedPassword) {
      return res.status(400).json({ message: "newPassword is required" });
    }

    const existing = await query("SELECT id FROM users WHERE id = ?", [id]);
    if (existing.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    await query(
      "UPDATE users SET password = ?, must_change_password = 1 WHERE id = ?",
      [normalizedPassword, id],
    );

    emitInvalidation(["users"], "user.password_reset");
    res.json({ message: "Password reset successfully" });
  } catch (error) {
    res.status(500).json({ message: "Database error" });
  }
});

module.exports = router;
