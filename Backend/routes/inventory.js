const express = require("express");

const { query } = require("../db");
const requireSuperAdmin = require("../middleware/requireSuperAdmin");
const { emitInvalidation } = require("../utils/realtime");

const router = express.Router();

const SELECT_INVENTORY = "SELECT id, device_name AS deviceName, serial_number AS serialNumber, COALESCE(ip_address, '') AS ipAddress, DATE_FORMAT(warranty_until, '%Y-%m-%d') AS warrantyUntil, location FROM inventory";

function normalizeWarrantyDate(value) {
  if (value === undefined) {
    return undefined;
  }

  const raw = String(value).trim();
  if (!raw) {
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return "INVALID";
  }

  return parsed.toISOString().slice(0, 10);
}

router.get("/inventory", async (req, res) => {
  try {
    const items = await query(SELECT_INVENTORY);
    res.json({ items });
  } catch (error) {
    res.status(500).json({ message: "Database error" });
  }
});

router.post("/inventory", requireSuperAdmin, async (req, res) => {
  try {
    const { deviceName, serialNumber, ipAddress, warrantyUntil, location } = req.body;
    if (!deviceName) {
      return res.status(400).json({ message: "deviceName is required" });
    }

    const normalizedWarranty = normalizeWarrantyDate(warrantyUntil);
    if (normalizedWarranty === "INVALID") {
      return res.status(400).json({
        message: "warrantyUntil must be YYYY-MM-DD or a valid date string",
      });
    }

    const id = `inv-${Date.now()}`;
    await query(
      "INSERT INTO inventory (id, device_name, serial_number, ip_address, warranty_until, location) VALUES (?, ?, ?, ?, ?, ?)",
      [id, deviceName, serialNumber || "", ipAddress || null, normalizedWarranty ?? null, location || ""],
    );

    const rows = await query(`${SELECT_INVENTORY} WHERE id = ?`, [id]);
    emitInvalidation(["inventory", "dashboard"], "inventory.created");
    res.status(201).json({ message: "Inventory item added", item: rows[0] });
  } catch (error) {
    res.status(500).json({ message: "Database error" });
  }
});

router.put("/inventory/:id", requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { deviceName, serialNumber, ipAddress, warrantyUntil, location } = req.body;

    const existing = await query(
      "SELECT id, device_name AS deviceName, serial_number AS serialNumber, COALESCE(ip_address, '') AS ipAddress, DATE_FORMAT(warranty_until, '%Y-%m-%d') AS warrantyUntil, location FROM inventory WHERE id = ?",
      [id],
    );
    if (existing.length === 0) {
      return res.status(404).json({ message: "Asset not found" });
    }

    const normalizedWarranty = normalizeWarrantyDate(warrantyUntil);
    if (normalizedWarranty === "INVALID") {
      return res.status(400).json({
        message: "warrantyUntil must be YYYY-MM-DD or a valid date string",
      });
    }

    const current = existing[0];
    const nextDeviceName = deviceName === undefined ? current.deviceName : deviceName;
    const nextSerialNumber =
      serialNumber === undefined ? current.serialNumber : serialNumber;
    const nextIpAddress =
      ipAddress === undefined ? current.ipAddress : (ipAddress || null);
    const nextWarrantyUntil =
      normalizedWarranty === undefined ? current.warrantyUntil : normalizedWarranty;
    const nextLocation = location === undefined ? current.location : location;

    await query(
      "UPDATE inventory SET device_name = ?, serial_number = ?, ip_address = ?, warranty_until = ?, location = ? WHERE id = ?",
      [nextDeviceName, nextSerialNumber, nextIpAddress, nextWarrantyUntil, nextLocation, id],
    );

    const updated = await query(`${SELECT_INVENTORY} WHERE id = ?`, [id]);
    emitInvalidation(["inventory", "dashboard"], "inventory.updated");
    res.json({ message: "Inventory updated", item: updated[0] });
  } catch (error) {
    res.status(500).json({ message: "Database error" });
  }
});

router.delete("/inventory/:id", requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await query("SELECT id FROM inventory WHERE id = ?", [id]);
    if (existing.length === 0) {
      return res.status(404).json({ message: "Asset not found" });
    }
    await query("DELETE FROM inventory WHERE id = ?", [id]);
    emitInvalidation(["inventory", "dashboard"], "inventory.deleted");
    res.json({ message: "Inventory item deleted" });
  } catch (error) {
    res.status(500).json({ message: "Database error" });
  }
});

module.exports = router;
