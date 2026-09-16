require("dotenv").config();
const { query } = require("../db");

setTimeout(async () => {
  try {
    const r1 = await query("SELECT id, device_name FROM inventory");
    console.log("inventory OK:", r1.length);

    const r2 = await query("SELECT id, severity, status, device_name, created_at AS createdAt, response_started_at AS responseStartedAt FROM alerts");
    console.log("alerts OK:", r2.length);

    const r3 = await query("SELECT device_name FROM repair_history");
    console.log("repair OK:", r3.length);

    const r4 = await query("SELECT id, name, role, is_active AS isActive, status, current_device AS currentDevice, current_ticket_id AS currentTicketId, last_response_seconds AS lastResponseSeconds, queue_order AS queueOrder FROM staff_queue ORDER BY queue_order");
    console.log("staff OK:", r4.length);

    const r5 = await query("SELECT root_cause AS rootCause FROM repair_history WHERE TRIM(COALESCE(root_cause, '')) <> ''");
    console.log("rootcause OK:", r5.length);

    const r6 = await query("SELECT diagnosis FROM alerts WHERE status IN ('EscalationQueue', 'ClaimPool', 'InProgress') AND TRIM(COALESCE(diagnosis, '')) <> ''");
    console.log("diagnosis OK:", r6.length);

    const r7 = await query("SELECT DATE_FORMAT(closed_at, '%Y-%m-%d') AS closeDate, AVG(mttr_minutes) AS avgMttr FROM repair_history WHERE closed_at IS NOT NULL AND mttr_minutes IS NOT NULL AND closed_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY) GROUP BY DATE_FORMAT(closed_at, '%Y-%m-%d') ORDER BY closeDate");
    console.log("mttr OK:", r7.length);

    console.log("\n✅ ALL dashboard queries passed!");
  } catch (e) {
    console.error("\n❌ FAILED:", e.message);
    console.error("   Code:", e.code);
  }
  process.exit(0);
}, 2000);
