const express = require("express");

const { query } = require("../db");
const { getRole, getUserId } = require("../utils/auth");

const router = express.Router();

const MONTH_NAMES_EN = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function escapeCsvValue(value) {
  const normalized = String(value ?? "").replace(/"/g, '""');
  return `"${normalized}"`;
}

router.get("/history", async (req, res) => {
  try {
    const role = getRole(req);
    const userId = getUserId(req);
    const search = (req.query.search || "").toString().toLowerCase();
    const month = parseInt(req.query.month || "0") || 0;
    const year = parseInt(req.query.year || "0") || 0;

    const conditions = [];
    const params = [];

    if (role === "user") {
      conditions.push("staff_id = ?");
      params.push(userId);
    }

    if (month && year) {
      conditions.push("YEAR(closed_at) = ? AND MONTH(closed_at) = ?");
      params.push(year, month);
    }

    if (search) {
      conditions.push("(LOWER(device_name) LIKE ? OR LOWER(staff_name) LIKE ?)");
      params.push(`%${search}%`, `%${search}%`);
    }

    const whereClause = conditions.length
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

    const data = await query(
      `SELECT id, alert_id AS alertId, device_name AS deviceName, staff_id AS staffId, staff_name AS staffName, root_cause AS rootCause, fix_method AS fixMethod, mttr_minutes AS mttrMinutes, queue_missed AS queueMissed, closed_at AS closedAt FROM repair_history ${whereClause} ORDER BY closed_at DESC`,
      params,
    );

    res.json({ items: data });
  } catch (error) {
    res.status(500).json({ message: "Database error" });
  }
});

router.get("/history/export", async (req, res) => {
  try {
    const role = getRole(req);
    const userId = getUserId(req);
    const month = parseInt(req.query.month || "0") || 0;
    const year = parseInt(req.query.year || "0") || 0;

    const conditions = [];
    const params = [];

    if (role === "user") {
      conditions.push("staff_id = ?");
      params.push(userId);
    }

    if (month && year) {
      conditions.push("YEAR(closed_at) = ? AND MONTH(closed_at) = ?");
      params.push(year, month);
    }

    const whereClause = conditions.length
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

    const data = await query(
      `SELECT id, device_name AS deviceName, staff_name AS staffName, root_cause AS rootCause, fix_method AS fixMethod, mttr_minutes AS mttrMinutes, queue_missed AS queueMissed, closed_at AS closedAt FROM repair_history ${whereClause} ORDER BY closed_at DESC`,
      params,
    );

    const label = month && year ? `${MONTH_NAMES_EN[month - 1]}-${year}` : "all";
    const filename = `repair-history-${label}.csv`;

    const csv = [
      "id,deviceName,staffName,rootCause,fixMethod,mttrMinutes,queueMissed,closedAt",
      ...data.map((item) =>
        [
          item.id,
          item.deviceName,
          item.staffName,
          item.rootCause,
          item.fixMethod,
          item.mttrMinutes,
          item.queueMissed,
          item.closedAt,
        ]
          .map(escapeCsvValue)
          .join(","),
      ),
    ].join("\r\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename=${filename}`);
    res.send("﻿" + csv);
  } catch (error) {
    res.status(500).json({ message: "Database error" });
  }
});

module.exports = router;
