require("dotenv").config();
const { query } = require("../db");

(async () => {
  try {
    const rows = await query(
      "SELECT id, device_name AS deviceName FROM inventory ORDER BY device_name"
    );
    console.table(rows);
  } catch (error) {
    console.error(error.message || error);
  }
  process.exit(0);
})();
