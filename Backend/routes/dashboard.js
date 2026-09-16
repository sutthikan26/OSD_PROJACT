const express = require("express");

const { query } = require("../db");

const router = express.Router();

router.get("/dashboard", async (req, res) => {
  try {
    const inventoryRows = await query("SELECT id, device_name FROM inventory");
    const alertRows = await query(
      "SELECT id, severity, status, device_name, created_at AS createdAt, response_started_at AS responseStartedAt FROM alerts",
    );
    const repairRows = await query(
      "SELECT device_name FROM repair_history",
    );
    const staffQueue = await query(
      "SELECT id, name, role, is_active AS isActive, status, current_device AS currentDevice, current_ticket_id AS currentTicketId, last_response_seconds AS lastResponseSeconds, queue_order AS queueOrder FROM staff_queue ORDER BY queue_order",
    );
    const repairRootCauseRows = await query(
      "SELECT root_cause AS rootCause FROM repair_history WHERE TRIM(COALESCE(root_cause, '')) <> ''",
    );
    const activeDiagnosisRows = await query(
      "SELECT diagnosis FROM alerts WHERE status IN ('EscalationQueue', 'ClaimPool', 'InProgress') AND TRIM(COALESCE(diagnosis, '')) <> ''",
    );
    const mttrByDateRows = await query(
      `SELECT DATE_FORMAT(closed_at, '%Y-%m-%d') AS closeDate, AVG(mttr_minutes) AS avgMttr, COUNT(*) AS incidentCount
       FROM repair_history
       WHERE closed_at IS NOT NULL AND mttr_minutes IS NOT NULL
         AND closed_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
       GROUP BY DATE_FORMAT(closed_at, '%Y-%m-%d')
       ORDER BY closeDate`,
    );

    const nowEpochSeconds = Math.floor(Date.now() / 1000);
    const inProgressResponseSeconds = new Map(
      alertRows
        .filter((a) => a.status === "InProgress")
        .map((a) => {
          const createdAtMs = a.createdAt ? new Date(a.createdAt).getTime() : null;
          const startedAtMs = a.responseStartedAt
            ? new Date(a.responseStartedAt).getTime()
            : null;
          if (!createdAtMs || !startedAtMs || startedAtMs < createdAtMs) {
            return [a.id, null];
          }
          const seconds = Math.max(
            10,
            Math.round((startedAtMs - createdAtMs) / 1000),
          );
          return [a.id, seconds];
        }),
    );

    const staffStatus = staffQueue.map((staff) => {
      const row = {
        ...staff,
        isActive: Boolean(staff.isActive),
        lastResponseSeconds: Number(staff.lastResponseSeconds) || 0,
      };

      // Busy means currently handling an incident.
      if (row.status === "Busy") {
        if (row.lastResponseSeconds > 1000000000) {
          const recovered = inProgressResponseSeconds.get(row.currentTicketId) || null;
          row.lastResponseSeconds = recovered || 0;
        }
        return row;
      }

      // Online/offline is determined by the status field set on login/logout.
      // A staff member stays online until they explicitly log out.
      const isOnline = row.status === "Available";
      row.isActive = isOnline;

      if (isOnline && row.lastResponseSeconds > 1000000000) {
        row.lastResponseSeconds = Math.max(0, nowEpochSeconds - row.lastResponseSeconds);
      } else {
        row.lastResponseSeconds = 0;
      }

      return row;
    });

    const total = inventoryRows.length;
    // Count unique unhealthy devices (not total alerts count)
    const unhealthyDevices = new Set(
      alertRows
        .filter((a) => a.status !== "Closed")
        .map((a) => a.device_name)
    );
    const unhealthy = Math.min(unhealthyDevices.size, total);
    const healthyRate = Math.max(
      0,
      Math.round(((total - unhealthy) / Math.max(1, total)) * 100),
    );

    const severityCounts = alertRows.reduce(
      (acc, item) => {
        if (item.status === "Closed") {
          return acc;
        }
        const normalized = String(item.severity || "").toLowerCase();
        if (normalized === "critical") acc.critical += 1;
        else if (normalized === "high") acc.high += 1;
        else if (normalized === "medium" || normalized === "warning")
          acc.warning += 1;
        else acc.info += 1;
        return acc;
      },
      { critical: 0, high: 0, warning: 0, info: 0 },
    );

    const inventoryNames = new Set(
      inventoryRows.map((r) => (r.device_name || "").trim().toLowerCase()).filter(Boolean)
    );

    const topAssetMap = new Map();
    [...alertRows, ...repairRows].forEach((item) => {
      const deviceName = (item.device_name || item.deviceName || "").trim();
      if (!deviceName) return;
      // Only count devices that exist in inventory
      if (!inventoryNames.has(deviceName.toLowerCase())) return;
      const count = topAssetMap.get(deviceName) || 0;
      topAssetMap.set(deviceName, count + 1);
    });

    const topAffectedAssets = Array.from(topAssetMap.entries())
      .map(([deviceName, alertCount]) => ({ deviceName, alertCount }))
      .sort((a, b) => b.alertCount - a.alertCount)
      .slice(0, 5);

    const rootCauseMap = new Map();
    for (const row of [...repairRootCauseRows, ...activeDiagnosisRows]) {
      const raw = String(row.rootCause || row.diagnosis || "").trim();
      if (!raw) continue;
      const key = raw.toLowerCase();
      const prev = rootCauseMap.get(key);
      if (!prev) {
        rootCauseMap.set(key, { cause: raw, count: 1 });
      } else {
        prev.count += 1;
      }
    }

    const sortedRootCauses = Array.from(rootCauseMap.values()).sort(
      (a, b) => b.count - a.count,
    );

    // Send all causes so the frontend can group by category accurately
    const rcaChart = sortedRootCauses.length > 0
      ? sortedRootCauses
      : [{ cause: "No Data", count: 1 }];

    const incidentAnalysis = rcaChart;

    const mttrDateMap = new Map(
      mttrByDateRows.map((row) => [
        row.closeDate,
        {
          mttrMinutes: Number(Number(row.avgMttr || 0).toFixed(1)),
          incidentCount: Number(row.incidentCount || 0),
        },
      ]),
    );
    const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const mttrTrendDaily = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const trend = mttrDateMap.get(dateStr) || { mttrMinutes: 0, incidentCount: 0 };
      mttrTrendDaily.push({
        day: dayLabels[d.getDay()],
        mttrMinutes: trend.mttrMinutes,
        incidentCount: trend.incidentCount,
      });
    }

    res.json({
      healthStatusPercent: healthyRate,
      availabilityGauge: {
        percent: healthyRate,
        healthyHosts: Math.max(0, total - unhealthy),
        totalHosts: total,
      },
      alertSeverityBreakdown: severityCounts,
      staffStatus,
      incidentAnalysis,
      rcaChart: incidentAnalysis,
      mttrTrendDaily,
      topAffectedAssets,
    });
  } catch (error) {
    console.error("Dashboard query error:", error);
    res.status(500).json({ message: "Database error" });
  }
});

module.exports = router;
