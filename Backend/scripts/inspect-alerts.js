require("dotenv").config();
const { query } = require("../db");

(async () => {
  try {
    const rows = await query(
      "SELECT id, device_name AS deviceName, severity, status, created_at AS createdAt, closed_at AS closedAt FROM alerts ORDER BY created_at DESC LIMIT 30"
    );
    console.table(rows);
  } catch (e) {
    console.error(e);
  }
  process.exit(0);
})();
