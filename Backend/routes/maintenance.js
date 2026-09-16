const express = require("express");

const { query } = require("../db");
const requireSuperAdmin = require("../middleware/requireSuperAdmin");
const { getUserId } = require("../utils/auth");
const { emitInvalidation } = require("../utils/realtime");

const router = express.Router();

const SELECT_MAINTENANCE = `
  SELECT id, customer_name AS customerName, title, location,
    start_at AS start, end_at AS end,
    pause_zabbix_alert AS pauseZabbixAlert,
    created_by AS createdBy,
    assignee_id AS assigneeId,
    COALESCE(
      NULLIF(TRIM(assignee_name), ''),
      (SELECT full_name FROM users WHERE id = maintenance_plans.assignee_id LIMIT 1),
      (SELECT name FROM staff_queue WHERE id = maintenance_plans.assignee_id LIMIT 1)
    ) AS assigneeName,
    status,
    acknowledged_by AS acknowledgedBy,
    acknowledged_at AS acknowledgedAt,
    COALESCE(
      NULLIF(TRIM(acknowledged_by_name), ''),
      (SELECT full_name FROM users WHERE id = maintenance_plans.acknowledged_by LIMIT 1),
      (SELECT name FROM staff_queue WHERE id = maintenance_plans.acknowledged_by LIMIT 1)
    ) AS acknowledgedByName,
    completed_by AS completedBy,
    completed_at AS completedAt,
    COALESCE(
      NULLIF(TRIM(completed_by_name), ''),
      (SELECT full_name FROM users WHERE id = maintenance_plans.completed_by LIMIT 1),
      (SELECT name FROM staff_queue WHERE id = maintenance_plans.completed_by LIMIT 1)
    ) AS completedByName
  FROM maintenance_plans`;

function normalizeDateTime(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString().slice(0, 19).replace("T", " ");
}

async function getAssigneeName(assigneeId) {
  if (!assigneeId) return null;
  const userRows = await query("SELECT full_name FROM users WHERE id = ?", [assigneeId]);
  if (userRows[0]?.full_name) return userRows[0].full_name;
  const rows = await query("SELECT name FROM staff_queue WHERE id = ?", [assigneeId]);
  return rows[0]?.name || null;
}

async function getStaffName(userId) {
  const userRows = await query("SELECT full_name FROM users WHERE id = ?", [userId]);
  if (userRows[0]?.full_name) return userRows[0].full_name;
  const rows = await query("SELECT name FROM staff_queue WHERE id = ?", [userId]);
  if (rows[0]?.name) return rows[0].name;
  return userId;
}

async function upsertCustomer(customerName, location) {
  const name = String(customerName || "").trim();
  if (!name) return;

  const existingRows = await query(
    "SELECT id, location FROM customers WHERE LOWER(TRIM(name)) = LOWER(TRIM(?)) LIMIT 1",
    [name],
  );

  if (existingRows[0]) {
    const existing = existingRows[0];
    await query(
      "UPDATE customers SET name = ?, location = ? WHERE id = ?",
      [name, location || existing.location || "", existing.id],
    );
    return;
  }

  const id = `c-${Date.now()}`;
  await query(
    "INSERT INTO customers (id, name, location) VALUES (?, ?, ?)",
    [id, name, location || ""],
  );
}

router.get("/maintenance", async (req, res) => {
  try {
    const items = await query(`${SELECT_MAINTENANCE} ORDER BY start_at DESC`);
    res.json({ items });
  } catch (error) {
    res.status(500).json({ message: "Database error" });
  }
});

router.post("/maintenance", requireSuperAdmin, async (req, res) => {
  try {
    const { customerName, title, location, start, end, pauseZabbixAlert, assigneeId } = req.body;
    const createdBy = getUserId(req);
    const assigneeName = await getAssigneeName(assigneeId);
    const id = `m-${Date.now()}`;
    const normalizedStart = normalizeDateTime(start);
    const normalizedEnd = normalizeDateTime(end);

    if (!normalizedStart || !normalizedEnd) {
      return res.status(400).json({ message: "Invalid start/end datetime" });
    }
    if (Date.parse(normalizedEnd) <= Date.parse(normalizedStart)) {
      return res.status(400).json({ message: "End time must be after start time" });
    }

    await upsertCustomer(customerName, location);

    await query(
      `INSERT INTO maintenance_plans
        (id, customer_name, title, location, start_at, end_at, pause_zabbix_alert, created_by, assignee_id, assignee_name, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'scheduled')`,
      [id, customerName || null, title, location || "", normalizedStart, normalizedEnd, pauseZabbixAlert ? 1 : 0, createdBy, assigneeId || null, assigneeName],
    );

    const rows = await query(`${SELECT_MAINTENANCE} WHERE id = ?`, [id]);
    emitInvalidation(
      ["maintenance", "customers", "dashboard"],
      "maintenance.created",
    );
    res.status(201).json({ message: "Maintenance plan created", item: rows[0] });
  } catch (error) {
    res.status(500).json({ message: "Database error" });
  }
});

router.put("/maintenance/:id", requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { customerName, title, location, start, end, pauseZabbixAlert, assigneeId } = req.body;
    const assigneeName = await getAssigneeName(assigneeId);
    const normalizedStart = normalizeDateTime(start);
    const normalizedEnd = normalizeDateTime(end);

    if (!normalizedStart || !normalizedEnd) {
      return res.status(400).json({ message: "Invalid start/end datetime" });
    }
    if (Date.parse(normalizedEnd) <= Date.parse(normalizedStart)) {
      return res.status(400).json({ message: "End time must be after start time" });
    }

    await upsertCustomer(customerName, location);

    await query(
      `UPDATE maintenance_plans SET
        customer_name = ?, title = ?, location = ?,
        start_at = ?, end_at = ?, pause_zabbix_alert = ?,
        assignee_id = ?, assignee_name = ?
       WHERE id = ?`,
      [customerName || null, title, location || "", normalizedStart, normalizedEnd, pauseZabbixAlert ? 1 : 0, assigneeId || null, assigneeName, id],
    );

    const rows = await query(`${SELECT_MAINTENANCE} WHERE id = ?`, [id]);
    emitInvalidation(
      ["maintenance", "customers", "dashboard"],
      "maintenance.updated",
    );
    res.json({ message: "Maintenance plan updated", item: rows[0] });
  } catch (error) {
    res.status(500).json({ message: "Database error" });
  }
});

router.delete("/maintenance/:id", requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await query("DELETE FROM maintenance_plans WHERE id = ?", [id]);
    emitInvalidation(
      ["maintenance", "dashboard"],
      "maintenance.deleted",
    );
    res.json({ message: "Maintenance plan deleted" });
  } catch (error) {
    res.status(500).json({ message: "Database error" });
  }
});

router.post("/maintenance/:id/ack", async (req, res) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);
    const userName = await getStaffName(userId);

    const targetRows = await query(
      `${SELECT_MAINTENANCE} WHERE id = ? LIMIT 1`,
      [id],
    );
    const target = targetRows[0];
    if (!target) {
      return res.status(404).json({ message: "Maintenance not found" });
    }
    if (target.status !== "scheduled") {
      return res.status(400).json({ message: "Maintenance is not in scheduled state" });
    }
    if (!target.assigneeId || target.assigneeId !== userId) {
      return res.status(403).json({ message: "Only assigned staff can acknowledge this maintenance" });
    }

    await query(
      `UPDATE maintenance_plans SET
        status = 'in_progress',
        acknowledged_by = ?, acknowledged_at = UTC_TIMESTAMP(), acknowledged_by_name = ?
       WHERE id = ?`,
      [userId, userName, id],
    );

    const rows = await query(`${SELECT_MAINTENANCE} WHERE id = ?`, [id]);
    emitInvalidation(
      ["maintenance", "dashboard"],
      "maintenance.acknowledged",
    );
    res.json({ message: "Maintenance acknowledged", item: rows[0] });
  } catch (error) {
    res.status(500).json({ message: "Database error" });
  }
});

router.post("/maintenance/:id/complete", async (req, res) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);
    const userName = await getStaffName(userId);

    const targetRows = await query(
      `${SELECT_MAINTENANCE} WHERE id = ? LIMIT 1`,
      [id],
    );
    const target = targetRows[0];
    if (!target) {
      return res.status(404).json({ message: "Maintenance not found" });
    }
    if (target.status !== "in_progress") {
      return res.status(400).json({ message: "Maintenance is not in progress" });
    }
    if (!target.assigneeId || target.assigneeId !== userId) {
      return res.status(403).json({ message: "Only assigned staff can complete this maintenance" });
    }

    await query(
      `UPDATE maintenance_plans SET
        status = 'completed',
        completed_by = ?, completed_at = UTC_TIMESTAMP(), completed_by_name = ?
       WHERE id = ?`,
      [userId, userName, id],
    );

    const rows = await query(`${SELECT_MAINTENANCE} WHERE id = ?`, [id]);
    emitInvalidation(
      ["maintenance", "dashboard", "history"],
      "maintenance.completed",
    );
    res.json({ message: "Maintenance completed", item: rows[0] });
  } catch (error) {
    res.status(500).json({ message: "Database error" });
  }
});

module.exports = router;
