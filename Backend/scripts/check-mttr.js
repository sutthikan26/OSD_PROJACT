const { query } = require("../db");

(async () => {
  console.log("=== repair_history: closed_at + mttr_minutes ===");
  const rows = await query(
    "SELECT id, device_name, mttr_minutes, closed_at, DAYOFWEEK(closed_at) AS dow FROM repair_history ORDER BY closed_at"
  );
  console.table(rows);

  console.log("\n=== AVG mttr grouped by DAYOFWEEK ===");
  const agg = await query(
    `SELECT DAYOFWEEK(closed_at) AS dow, COUNT(*) AS cnt, AVG(mttr_minutes) AS avgMttr
     FROM repair_history
     WHERE closed_at IS NOT NULL AND mttr_minutes IS NOT NULL
     GROUP BY DAYOFWEEK(closed_at)
     ORDER BY dow`
  );
  console.table(agg);

  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
