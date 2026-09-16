const express = require("express");

const { query } = require("../db");
const { getUserId } = require("../utils/auth");
const { emitInvalidation } = require("../utils/realtime");

const router = express.Router();

async function resolveStaffQueueTarget(assignedTo, assignedName = "") {
  const candidates = [assignedTo];
  if (typeof assignedTo === "string" && assignedTo.startsWith("u-")) {
    candidates.push(`s-${assignedTo.slice(2)}`);
  }

  const userRows = await query(
    "SELECT username, full_name AS fullName FROM users WHERE id = ? LIMIT 1",
    [assignedTo],
  );
  const user = userRows[0] || {};

  const rows = await query(
    `SELECT id, name FROM staff_queue
     WHERE id IN (?, ?)
        OR LOWER(TRIM(name)) IN (LOWER(TRIM(?)), LOWER(TRIM(?)), LOWER(TRIM(?)))
     ORDER BY queue_order
     LIMIT 1`,
    [
      candidates[0] || "",
      candidates[1] || "",
      user.username || "",
      user.fullName || "",
      assignedName || "",
    ],
  );

  return {
    queueId: rows[0]?.id || null,
    queueName: rows[0]?.name || null,
    userName: user.fullName || user.username || null,
  };
}

router.post("/repairs/:id/diagnosis", async (req, res) => {
  try {
    const { id } = req.params;
    const { rootCause, fixMethod } = req.body;
    const rows = await query(
      "SELECT id, device_name AS deviceName FROM alerts WHERE id = ?",
      [id],
    );
    const alert = rows[0];

    if (!alert) {
      return res.status(404).json({ message: "Alert not found" });
    }

    await query(
      "UPDATE alerts SET diagnosis = ?, fix_method = ? WHERE id = ?",
      [rootCause || "", fixMethod || "", id],
    );

    const normalizedRootCause = String(rootCause || "").trim().toLowerCase();
    const kbSuggestions = await query(
      `SELECT id, alert_id AS alertId, device_name AS deviceName, staff_id AS staffId,
              staff_name AS staffName, root_cause AS rootCause, fix_method AS fixMethod,
              mttr_minutes AS mttrMinutes, queue_missed AS queueMissed, closed_at AS closedAt
         FROM repair_history
        WHERE (device_name = ? AND (LOWER(root_cause) LIKE ? OR LOWER(fix_method) LIKE ?))
           OR (LOWER(root_cause) LIKE ? OR LOWER(fix_method) LIKE ?)
        ORDER BY 
          CASE WHEN device_name = ? THEN 0 ELSE 1 END,
          closed_at DESC
        LIMIT 10`,
      [alert.deviceName, `%${normalizedRootCause}%`, `%${normalizedRootCause}%`, 
       `%${normalizedRootCause}%`, `%${normalizedRootCause}%`,
       alert.deviceName],
    );

    const updatedAlert = await query(
      "SELECT id, device_name AS deviceName, severity, status, assigned_to AS assignedTo, queue_position AS queuePosition, created_at AS createdAt, response_started_at AS responseStartedAt, diagnosis, fix_method AS fixMethod, closed_at AS closedAt FROM alerts WHERE id = ?",
      [id],
    );

    emitInvalidation(
      ["alerts", "dashboard"],
      "repair.diagnosis.updated",
    );

    res.json({ alert: updatedAlert[0], kbSuggestions });
  } catch (error) {
    res.status(500).json({ message: "Database error" });
  }
});

router.post("/repairs/:id/finish", async (req, res) => {
  try {
    const { id } = req.params;
    const { rootCause, fixMethod } = req.body;
    const rows = await query(
      "SELECT id, device_name AS deviceName, assigned_to AS assignedTo, assigned_name AS assignedName, response_started_at AS responseStartedAt, diagnosis, fix_method AS fixMethod FROM alerts WHERE id = ?",
      [id],
    );
    const alert = rows[0];

    if (!alert) {
      return res.status(404).json({ message: "Alert not found" });
    }

    const finalRootCause = String(rootCause ?? alert.diagnosis ?? "").trim();
    const finalFixMethod = String(fixMethod ?? alert.fixMethod ?? "").trim();

    await query(
      "UPDATE alerts SET diagnosis = ?, fix_method = ?, status = 'Closed', closed_at = ? WHERE id = ?",
      [finalRootCause, finalFixMethod, new Date(), id],
    );

    const closedAt = new Date();

    const start = alert.responseStartedAt
      ? new Date(alert.responseStartedAt).getTime()
      : Date.now() - 10 * 60 * 1000;
    const mttrMinutes = Math.max(1, Math.round((Date.now() - start) / 60000));

    const staffId = alert.assignedTo || getUserId(req);
    const resolvedStaff = await resolveStaffQueueTarget(
      staffId,
      alert.assignedName || "",
    );
    const staffName = resolvedStaff.queueName || alert.assignedName || resolvedStaff.userName || "Unknown";

    await query(
      "INSERT INTO repair_history (id, alert_id, device_name, staff_id, staff_name, root_cause, fix_method, mttr_minutes, queue_missed, closed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        `h-${Date.now()}`,
        alert.id,
        alert.deviceName,
        staffId,
        staffName,
        finalRootCause || "Unknown",
        finalFixMethod || "-",
        mttrMinutes,
        0,
        closedAt,
      ],
    );

    if (resolvedStaff.queueId) {
      await query(
        "UPDATE staff_queue SET status = 'Available', current_device = NULL, current_ticket_id = NULL WHERE id = ?",
        [resolvedStaff.queueId],
      );
    }

    const updatedAlert = await query(
      "SELECT id, device_name AS deviceName, severity, status, assigned_to AS assignedTo, queue_position AS queuePosition, created_at AS createdAt, response_started_at AS responseStartedAt, diagnosis, fix_method AS fixMethod, closed_at AS closedAt FROM alerts WHERE id = ?",
      [id],
    );

    emitInvalidation(
      ["alerts", "queue", "history", "dashboard"],
      "repair.finished",
    );

    res.json({
      message: "Repair finished successfully",
      ackSent: false,
      alert: updatedAlert[0],
    });
  } catch (error) {
    res.status(500).json({ message: "Database error" });
  }
});

module.exports = router;
