const express = require("express");

const { query } = require("../db");
const requireSuperAdmin = require("../middleware/requireSuperAdmin");

const router = express.Router();

router.get("/zabbix-link", async (req, res) => {
  try {
    const rows = await query(
      "SELECT base_url AS baseUrl, api_url AS apiUrl, api_token AS apiToken FROM zabbix_link WHERE id = 1",
    );
    if (rows.length === 0) {
      return res.json({ baseUrl: "", apiUrl: "", apiToken: "" });
    }
    res.json({ baseUrl: rows[0].baseUrl || "", apiUrl: rows[0].apiUrl || "", apiToken: rows[0].apiToken || "" });
  } catch (error) {
    // Return empty on error (table may not exist yet)
    res.json({ baseUrl: "", apiUrl: "", apiToken: "" });
  }
});

router.put("/zabbix-link", requireSuperAdmin, async (req, res) => {
  try {
    const { baseUrl, apiUrl, apiToken } = req.body;
    await query(
      "INSERT INTO zabbix_link (id, base_url, api_url, api_token) VALUES (1, ?, ?, ?) ON DUPLICATE KEY UPDATE base_url = ?, api_url = ?, api_token = ?",
      [baseUrl || "", apiUrl || "", apiToken || "", baseUrl || "", apiUrl || "", apiToken || ""],
    );
    res.json({ message: "Zabbix link saved", baseUrl, apiUrl, apiToken });
  } catch (error) {
    res.status(500).json({ message: "Database error" });
  }
});

module.exports = router;
