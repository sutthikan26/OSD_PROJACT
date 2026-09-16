const { query } = require("../db");

(async () => {
  console.log("=== repair_history (root_cause) ===");
  const rh = await query(
    "SELECT id, device_name, root_cause, fix_method FROM repair_history ORDER BY id"
  );
  console.table(rh);

  console.log("\n=== alerts — active + diagnosis ===");
  const al = await query(
    "SELECT id, device_name, status, diagnosis FROM alerts WHERE status IN ('EscalationQueue','ClaimPool','InProgress') ORDER BY id"
  );
  console.table(al);

  console.log("\n=== All alerts (id, status, diagnosis) ===");
  const allAl = await query(
    "SELECT id, device_name, status, diagnosis FROM alerts ORDER BY id"
  );
  console.table(allAl);

  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
