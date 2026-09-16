const express = require("express");

const { registerRealtimeClient } = require("../utils/realtime");

const router = express.Router();

router.get("/events", (req, res) => {
  registerRealtimeClient(req, res);
});

module.exports = router;