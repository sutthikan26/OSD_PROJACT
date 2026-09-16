const express = require("express");

const { query } = require("../db");
const requireSuperAdmin = require("../middleware/requireSuperAdmin");

const router = express.Router();

router.get("/notifications", requireSuperAdmin, async (req, res) => {
  try {
    const rows = await query(
      "SELECT line_notify AS lineNotify, telegram, min_severity AS minSeverity, receivers FROM notification_settings WHERE id = 1",
    );

    if (rows.length === 0) {
      return res.json({
        lineNotify: true,
        telegram: false,
        minSeverity: "High",
        receivers: ["noc-oncall", "supervisor"],
      });
    }

    const item = rows[0];
    item.receivers = Array.isArray(item.receivers)
      ? item.receivers
      : JSON.parse(item.receivers || "[]");

    res.json(item);
  } catch (error) {
    res.status(500).json({ message: "Database error" });
  }
});

router.put("/notifications", requireSuperAdmin, async (req, res) => {
  try {
    const { lineNotify, telegram, minSeverity, receivers } = req.body;
    const payload = {
      lineNotify: Boolean(lineNotify),
      telegram: Boolean(telegram),
      minSeverity: minSeverity || "High",
      receivers: Array.isArray(receivers) ? receivers : ["noc-oncall"],
    };

    await query(
      "INSERT INTO notification_settings (id, line_notify, telegram, min_severity, receivers) VALUES (1, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE line_notify = VALUES(line_notify), telegram = VALUES(telegram), min_severity = VALUES(min_severity), receivers = VALUES(receivers)",
      [
        payload.lineNotify ? 1 : 0,
        payload.telegram ? 1 : 0,
        payload.minSeverity,
        JSON.stringify(payload.receivers),
      ],
    );

    res.json({
      message: "Notification settings saved",
      settings: payload,
    });
  } catch (error) {
    res.status(500).json({ message: "Database error" });
  }
});

module.exports = router;
