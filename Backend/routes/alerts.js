const express = require("express");

const { query } = require("../db");
const { getUserId } = require("../utils/auth");
const { emitInvalidation } = require("../utils/realtime");

const router = express.Router();

const SELECT_ALERT = `SELECT id, device_name AS deviceName, problem_name AS problemName, severity, status,
  assigned_to AS assignedTo, assigned_name AS assignedName,
  queue_position AS queuePosition, created_at AS createdAt,
  response_started_at AS responseStartedAt, diagnosis,
  fix_method AS fixMethod, closed_at AS closedAt FROM alerts`;

async function resolveStaffQueueTarget(assignedTo) {
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

  return {
    queueId: rows[0]?.id || null,
    queueName: rows[0]?.name || null,
    fullName: user.fullName || null,
  };
}

async function resolveNextEscalationAssignee(alert) {
  const currentStaff = alert.assignedTo
    ? await resolveStaffQueueTarget(alert.assignedTo)
    : { queueId: null };

  const currentQueueRows = currentStaff.queueId
    ? await query(
        "SELECT queue_order AS queueOrder FROM staff_queue WHERE id = ? LIMIT 1",
        [currentStaff.queueId],
      )
    : [];
  const currentQueueOrder = currentQueueRows[0]?.queueOrder || 0;

  const nextRows = await query(
    `SELECT sq.id, sq.name, sq.queue_order AS queueOrder
       FROM staff_queue sq
      WHERE sq.is_active = 1
        AND sq.status = 'Available'
        AND sq.queue_order > ?
      ORDER BY sq.queue_order ASC
      LIMIT 1`,
    [currentQueueOrder],
  );

  const nextStaff = nextRows[0];
  if (!nextStaff) {
    return null;
  }

  const userRows = await query(
    `SELECT id, full_name AS fullName
       FROM users
      WHERE LOWER(TRIM(username)) = LOWER(TRIM(?))
         OR LOWER(TRIM(full_name)) = LOWER(TRIM(?))
      LIMIT 1`,
    [nextStaff.name, nextStaff.name],
  );
  const user = userRows[0];

  return {
    assignedTo: user?.id || nextStaff.id,
    assignedName: user?.fullName || nextStaff.name,
  };
}

async function processEscalationTimeouts() {
  let changed = false;
  const expiredAlerts = await query(
    `${SELECT_ALERT} WHERE status = 'EscalationQueue' AND TIMESTAMPDIFF(SECOND, created_at, UTC_TIMESTAMP()) >= 300 ORDER BY created_at ASC`,
  );

  for (const alert of expiredAlerts) {
    const nextAssignee = await resolveNextEscalationAssignee(alert);

    if (nextAssignee) {
      await query(
        "UPDATE alerts SET assigned_to = ?, assigned_name = ?, created_at = UTC_TIMESTAMP() WHERE id = ?",
        [nextAssignee.assignedTo, nextAssignee.assignedName, alert.id],
      );
      changed = true;
      continue;
    }

    await query(
      "UPDATE alerts SET status = 'ClaimPool', queue_position = NULL, assigned_to = NULL, assigned_name = NULL WHERE id = ?",
      [alert.id],
    );
    changed = true;
  }

  return changed;
}

router.get("/alerts", async (req, res) => {
  try {
    const changed = await processEscalationTimeouts();

    const escalationQueue = await query(
      `${SELECT_ALERT} WHERE status = 'EscalationQueue' ORDER BY queue_position`,
    );
    const claimPool = await query(
      `${SELECT_ALERT} WHERE status = 'ClaimPool'`,
    );
    const inProgress = await query(
      `${SELECT_ALERT} WHERE status = 'InProgress'`,
    );

    if (changed) {
      emitInvalidation(["alerts", "dashboard"], "alerts.timeout.processed");
    }

    res.json({ escalationQueue, claimPool, inProgress });
  } catch (error) {
    res.status(500).json({ message: "Database error" });
  }
});

router.post("/alerts/:id/accept", async (req, res) => {
  try {
    const { id } = req.params;
    const { staffId, mode } = req.body;
    const rows = await query(
      "SELECT id, device_name AS deviceName, created_at AS createdAt, status, assigned_to AS assignedTo, assigned_name AS assignedName FROM alerts WHERE id = ?",
      [id],
    );
    const alert = rows[0];

    if (!alert) {
      return res.status(404).json({ message: "Alert not found" });
    }

    const requesterId = getUserId(req);
    const isEscalationMode = mode !== "claim";
    if (
      isEscalationMode &&
      alert.status === "EscalationQueue" &&
      alert.assignedTo &&
      alert.assignedTo !== requesterId
    ) {
      return res.status(403).json({
        message: "This alert is currently assigned to another staff member in queue order",
      });
    }

    const assignedTo = staffId || requesterId;
    const responseStartedAt = new Date();

    const resolvedStaff = await resolveStaffQueueTarget(assignedTo);
    const assignedName =
      resolvedStaff.queueName || resolvedStaff.fullName || null;

    await query(
      "UPDATE alerts SET status = 'InProgress', assigned_to = ?, assigned_name = ?, response_started_at = ? WHERE id = ?",
      [assignedTo, assignedName, responseStartedAt, id],
    );

    const lastResponseSeconds = Math.max(
      10,
      Math.round((Date.now() - new Date(alert.createdAt).getTime()) / 1000),
    );

    if (resolvedStaff.queueId) {
      await query(
        "UPDATE staff_queue SET status = 'Busy', current_device = ?, current_ticket_id = ?, last_response_seconds = ? WHERE id = ?",
        [alert.deviceName, alert.id, lastResponseSeconds, resolvedStaff.queueId],
      );
    }

    const updatedAlertRows = await query(
      `${SELECT_ALERT} WHERE id = ?`,
      [id],
    );

    emitInvalidation(
      ["alerts", "queue", "dashboard"],
      mode === "claim" ? "alert.claimed" : "alert.accepted",
    );

    res.json({
      message:
        mode === "claim"
          ? "Alert claimed successfully"
          : "Alert accepted successfully",
      alert: updatedAlertRows[0],
    });
  } catch (error) {
    res.status(500).json({ message: "Database error" });
  }
});

router.post("/alerts/:id/defer", async (req, res) => {
  try {
    const { id } = req.params;
    const requesterId = String(getUserId(req) || "");
    const rows = await query(
      "SELECT id, device_name AS deviceName, status, assigned_to AS assignedTo, assigned_name AS assignedName, created_at AS createdAt FROM alerts WHERE id = ?",
      [id],
    );
    const alert = rows[0];

    if (!alert) {
      return res.status(404).json({ message: "Alert not found" });
    }

    if (alert.status !== "EscalationQueue") {
      return res.status(400).json({ message: "Only escalation queue alerts can be deferred" });
    }

    if (!alert.assignedTo || alert.assignedTo !== requesterId) {
      return res.status(403).json({
        message: "Only the currently assigned staff member can defer this alert",
      });
    }

    const nextAssignee = await resolveNextEscalationAssignee(alert);

    if (nextAssignee) {
      await query(
        "UPDATE alerts SET assigned_to = ?, assigned_name = ?, created_at = UTC_TIMESTAMP() WHERE id = ?",
        [nextAssignee.assignedTo, nextAssignee.assignedName, id],
      );

      const updatedRows = await query(`${SELECT_ALERT} WHERE id = ?`, [id]);
      emitInvalidation(["alerts", "dashboard", "queue"], "alert.deferred");
      return res.json({
        message: "Alert forwarded to next queue assignee",
        alert: updatedRows[0],
      });
    }

    await query(
      "UPDATE alerts SET status = 'ClaimPool', queue_position = NULL, assigned_to = NULL, assigned_name = NULL WHERE id = ?",
      [id],
    );

    const updatedRows = await query(`${SELECT_ALERT} WHERE id = ?`, [id]);
    emitInvalidation(["alerts", "dashboard", "queue"], "alert.deferred.to-claim-pool");
    return res.json({
      message: "No next assignee available. Alert moved to claim pool",
      alert: updatedRows[0],
    });
  } catch (error) {
    res.status(500).json({ message: "Database error" });
  }
});

module.exports = router;
