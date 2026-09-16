const express = require("express");

const { query } = require("../db");
const requireSuperAdmin = require("../middleware/requireSuperAdmin");
const { emitInvalidation } = require("../utils/realtime");

const router = express.Router();

router.get("/users-queue", requireSuperAdmin, async (req, res) => {
  try {
    const sortedQueue = await query(
      "SELECT id, name, role, is_active AS isActive, status, current_device AS currentDevice, current_ticket_id AS currentTicketId, last_response_seconds AS lastResponseSeconds, queue_order AS queueOrder FROM staff_queue ORDER BY queue_order",
    );
    res.json({ queue: sortedQueue });
  } catch (error) {
    res.status(500).json({ message: "Database error" });
  }
});

router.put("/users-queue", requireSuperAdmin, async (req, res) => {
  try {
    const { queue } = req.body;
    if (!Array.isArray(queue)) {
      return res.status(400).json({ message: "queue must be an array" });
    }

    const normalized = queue
      .map((item, index) => ({
        id: item.id || `s-${Date.now()}-${index + 1}`,
        name: item.name || `Staff-${index + 1}`,
        role: item.role === "admin" ? "admin" : "user",
        isActive: item.isActive !== false,
        status:
          item.isActive === false
            ? "Available"
            : item.status === "Busy"
              ? "Busy"
              : "Available",
        currentDevice:
          item.isActive === false
            ? null
            : item.status === "Busy"
              ? item.currentDevice || "-"
              : null,
        currentTicketId:
          item.isActive === false
            ? null
            : item.status === "Busy"
              ? item.currentTicketId || null
              : null,
        lastResponseSeconds: Number.isFinite(item.lastResponseSeconds)
          ? Number(item.lastResponseSeconds)
          : 0,
        queueOrder: index + 1,
      }))
      .filter((item) => item.name.trim().length > 0);

    await query("DELETE FROM staff_queue");

    for (const item of normalized) {
      await query(
        "INSERT INTO staff_queue (id, name, role, is_active, status, current_device, current_ticket_id, last_response_seconds, queue_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [
          item.id,
          item.name,
          item.role,
          item.isActive ? 1 : 0,
          item.status,
          item.currentDevice,
          item.currentTicketId,
          item.lastResponseSeconds,
          item.queueOrder,
        ],
      );

      const mappedUserId = item.id.startsWith("s-")
        ? `u-${item.id.slice(2)}`
        : item.id;

      await query(
        `UPDATE users
            SET role = ?
          WHERE id = ?
             OR id = ?
             OR LOWER(TRIM(username)) = LOWER(TRIM(?))
             OR LOWER(TRIM(full_name)) = LOWER(TRIM(?))`,
        [item.role, item.id, mappedUserId, item.name, item.name],
      );
    }

    emitInvalidation(
      ["queue", "users", "maintenance", "dashboard"],
      "queue.updated",
    );

    res.json({ message: "Queue updated", queue: normalized });
  } catch (error) {
    res.status(500).json({ message: "Database error" });
  }
});

module.exports = router;
