const express = require("express");

const { query } = require("../db");
const requireSuperAdmin = require("../middleware/requireSuperAdmin");
const { emitInvalidation } = require("../utils/realtime");

const router = express.Router();

router.get("/customers", async (req, res) => {
  try {
    const items = await query(
      "SELECT id, name, location FROM customers ORDER BY name",
    );
    res.json({ items });
  } catch (error) {
    res.status(500).json({ message: "Database error" });
  }
});

router.post("/customers", requireSuperAdmin, async (req, res) => {
  try {
    const { name, location } = req.body;
    if (!name) {
      return res.status(400).json({ message: "name is required" });
    }

    const id = `c-${Date.now()}`;
    await query(
      "INSERT INTO customers (id, name, location) VALUES (?, ?, ?)",
      [id, name, location || ""],
    );

    const rows = await query(
      "SELECT id, name, location FROM customers WHERE id = ?",
      [id],
    );
    emitInvalidation(["customers", "maintenance"], "customer.created");
    res.status(201).json({ message: "Customer created", item: rows[0] });
  } catch (error) {
    res.status(500).json({ message: "Database error" });
  }
});

router.delete("/customers/:id", requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await query("DELETE FROM customers WHERE id = ?", [id]);
    emitInvalidation(["customers", "maintenance"], "customer.deleted");
    res.json({ message: "Customer deleted" });
  } catch (error) {
    res.status(500).json({ message: "Database error" });
  }
});

module.exports = router;
