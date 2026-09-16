const { query } = require("../db");

async function run() {
  await query(`
    UPDATE maintenance_plans mp
    LEFT JOIN users ua ON ua.id = mp.assignee_id
    LEFT JOIN staff_queue sa ON sa.id = mp.assignee_id
    LEFT JOIN users uu ON uu.id = mp.acknowledged_by
    LEFT JOIN staff_queue su ON su.id = mp.acknowledged_by
    LEFT JOIN users uc ON uc.id = mp.completed_by
    LEFT JOIN staff_queue sc ON sc.id = mp.completed_by
    SET
      mp.assignee_name = COALESCE(ua.full_name, sa.name, mp.assignee_name),
      mp.acknowledged_by_name = COALESCE(uu.full_name, su.name, mp.acknowledged_by_name),
      mp.completed_by_name = COALESCE(uc.full_name, sc.name, mp.completed_by_name)
    WHERE mp.assignee_id IS NOT NULL OR mp.acknowledged_by IS NOT NULL OR mp.completed_by IS NOT NULL
  `);

  const rows = await query(
    "SELECT id, title, assignee_id AS assigneeId, assignee_name AS assigneeName, acknowledged_by_name AS acknowledgedByName, completed_by_name AS completedByName, status FROM maintenance_plans ORDER BY start_at DESC LIMIT 10",
  );

  console.log(JSON.stringify(rows, null, 2));
}

run()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
