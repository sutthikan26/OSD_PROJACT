require("dotenv").config();
const { query } = require("../db");

async function main() {
  const users = await query(
    "SELECT id, username, full_name AS name, role, password FROM users",
  );
  console.log(users);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
