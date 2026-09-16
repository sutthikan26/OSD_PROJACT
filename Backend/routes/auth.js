const express = require("express");

const { query } = require("../db");
const { sanitizeUser } = require("../utils/auth");
const mockUsers = require("../data/users");
const { emitInvalidation } = require("../utils/realtime");

const router = express.Router();

async function resolveStaffQueueTargetByUserId(userId) {
  const candidates = [userId];
  if (typeof userId === "string" && userId.startsWith("u-")) {
    candidates.push(`s-${userId.slice(2)}`);
  }

  const userRows = await query(
    "SELECT username, full_name AS fullName FROM users WHERE id = ? LIMIT 1",
    [userId],
  );
  const user = userRows[0] || {};

  const rows = await query(
    `SELECT id FROM staff_queue
     WHERE id IN (?, ?)
        OR LOWER(TRIM(name)) IN (LOWER(TRIM(?)), LOWER(TRIM(?)))
     ORDER BY queue_order
     LIMIT 1`,
    [
      candidates[0] || "",
      candidates[1] || "",
      user.username || "",
      user.fullName || "",
    ],
  );

  return rows[0]?.id || null;
}

async function markStaffOnline(userId) {
  const queueId = await resolveStaffQueueTargetByUserId(userId);
  if (!queueId) return;

  const nowEpochSeconds = Math.floor(Date.now() / 1000);
  await query(
    "UPDATE staff_queue SET status = IF(status = 'Busy', 'Busy', 'Available'), last_response_seconds = IF(status = 'Busy', last_response_seconds, ?) WHERE id = ?",
    [nowEpochSeconds, queueId],
  );
}

async function markStaffOffline(userId) {
  const queueId = await resolveStaffQueueTargetByUserId(userId);
  if (!queueId) return;

  await query(
    "UPDATE staff_queue SET status = IF(status = 'Busy', 'Busy', 'Offline') WHERE id = ?",
    [queueId],
  );
}

router.post("/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const rows = await query(
      "SELECT id, username, password, role, full_name AS name, must_change_password AS mustChangePassword FROM users WHERE username = ? AND password = ?",
      [username, password],
    );
    const user = rows[0];

    if (!user) {
      return res.status(401).json({ message: "Invalid username or password" });
    }

    await markStaffOnline(user.id);
    emitInvalidation(["queue", "dashboard"], "auth.login");

    res.json({
      token: `mock-token-${user.id}`,
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.error("Login error:", error);

    const { username, password } = req.body;
    const fallbackUser = mockUsers.find(
      (item) => item.username === username && item.password === password,
    );

    if (!fallbackUser) {
      return res.status(401).json({ message: "Invalid username or password" });
    }

    return res.json({
      token: `mock-token-${fallbackUser.id}`,
      user: sanitizeUser({
        id: fallbackUser.id,
        username: fallbackUser.username,
        role: fallbackUser.role,
        name: fallbackUser.name,
      }),
    });
  }
});

router.post("/auth/ping", async (req, res) => {
  try {
    const userId = String(req.headers["x-user-id"] || "");
    if (!userId) {
      return res.status(400).json({ message: "user id is required" });
    }

    await markStaffOnline(userId);
    emitInvalidation(["queue", "dashboard"], "auth.ping");
    res.json({ message: "Presence updated" });
  } catch (error) {
    res.status(500).json({ message: "Database error" });
  }
});

router.post("/auth/change-password", async (req, res) => {
  try {
    const userId = String(req.headers["x-user-id"] || "");
    const { newPassword } = req.body;

    const normalizedPassword = (newPassword || "").toString();
    if (!userId || !normalizedPassword) {
      return res.status(400).json({ message: "userId and newPassword are required" });
    }

    const existing = await query("SELECT id FROM users WHERE id = ?", [userId]);
    if (existing.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    await query(
      "UPDATE users SET password = ?, must_change_password = 0 WHERE id = ?",
      [normalizedPassword, userId],
    );

    res.json({ message: "Password changed successfully" });
  } catch (error) {
    res.status(500).json({ message: "Database error" });
  }
});

router.post("/auth/logout", async (req, res) => {
  try {
    const userId = String(req.headers["x-user-id"] || "");
    if (!userId) {
      return res.status(400).json({ message: "user id is required" });
    }

    await markStaffOffline(userId);
    emitInvalidation(["queue", "dashboard"], "auth.logout");
    res.json({ message: "Logged out" });
  } catch (error) {
    res.status(500).json({ message: "Database error" });
  }
});

module.exports = router;
