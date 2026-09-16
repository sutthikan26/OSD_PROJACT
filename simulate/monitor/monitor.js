const http = require("http");

// ─────────────────────────────────────────────
//  Config from environment variables
// ─────────────────────────────────────────────
const BACKEND_URL = process.env.BACKEND_URL || "http://backend:4000";
const WEBHOOK_TOKEN = process.env.ZABBIX_WEBHOOK_TOKEN || "change-me";
const CHECK_INTERVAL_MS = parseInt(process.env.CHECK_INTERVAL_MS || "5000");

// ─────────────────────────────────────────────
//  Virtual Switches — ตรงกับ inventory ใน DB จริง
//  id ต้องตรงกับ id ใน inventory table
// ─────────────────────────────────────────────
const SWITCHES = [
  { id: "inv-1774253407593", name: "FortiGate 60F",      host: "sim-switch-1", port: 80 },
  { id: "inv-1774253426257", name: "Ruijie RG-RAP2260",  host: "sim-switch-2", port: 80 },
  { id: "inv-1774253454591", name: "Cisco C9300-24T",    host: "sim-switch-3", port: 80 },
  { id: "inv-1774253475994", name: "SwitchCisco",       host: "sim-switch-4", port: 80 },
];

// Track up/down state per switch (in memory)
const switchState = {};
SWITCHES.forEach((sw) => {
  switchState[sw.id] = { isDown: false };
});

// ─────────────────────────────────────────────
//  Ping a switch (HTTP GET, 3 s timeout)
//  Returns true = reachable, false = down
// ─────────────────────────────────────────────
function checkSwitch(sw) {
  return new Promise((resolve) => {
    const req = http.get(
      { hostname: sw.host, port: sw.port, path: "/", timeout: 3000 },
      (res) => { res.destroy(); resolve(true); }
    );
    req.on("error",   () => resolve(false));
    req.on("timeout", () => { req.destroy(); resolve(false); });
  });
}

// ─────────────────────────────────────────────
//  Send webhook to Backend  (same format Zabbix uses)
//  isDown = true  → PROBLEM  (alert appears on dashboard)
//  isDown = false → RESOLVED (alert closed on dashboard)
// ─────────────────────────────────────────────
function sendWebhook(sw, isDown) {
  return new Promise((resolve) => {
    const payload = JSON.stringify({
      eventid:     sw.id,                       // unique ID per switch
      host:        sw.name,                     // shows as device name
      name:        isDown
        ? `${sw.name}: Unavailable by ICMP ping`
        : `${sw.name}: Unavailable by ICMP ping`,  // problem name (trigger name)
      severity:    "High",
      event_value: isDown ? 1 : 0,              // 1 = problem, 0 = resolved
      status:      isDown ? "PROBLEM" : "RESOLVED",
      message:     isDown
        ? `Switch ${sw.name} is DOWN – no response detected`
        : `Switch ${sw.name} is UP – connection restored`,
      token:       WEBHOOK_TOKEN,
    });

    const backendUrl = new URL(`${BACKEND_URL}/api/zabbix/webhook`);
    const options = {
      hostname: backendUrl.hostname,
      port:     backendUrl.port || 4000,
      path:     backendUrl.pathname,
      method:   "POST",
      headers: {
        "Content-Type":    "application/json",
        "Content-Length":  Buffer.byteLength(payload),
        "x-zabbix-token":  WEBHOOK_TOKEN,
      },
    };

    const req = http.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end",  () => {
        const icon = isDown ? "🔴" : "🟢";
        console.log(`[WEBHOOK] ${icon} ${sw.name} → ${isDown ? "DOWN" : "UP"} | HTTP ${res.statusCode} | ${body.trim()}`);
        resolve();
      });
    });

    req.on("error", (err) => {
      console.error(`[WEBHOOK ERROR] ${sw.name}: ${err.message}`);
      resolve();
    });

    req.write(payload);
    req.end();
  });
}

// ─────────────────────────────────────────────
//  Main monitoring loop  (runs every CHECK_INTERVAL_MS)
// ─────────────────────────────────────────────
async function monitorLoop() {
  const timestamp = new Date().toISOString().slice(11, 19);
  console.log(`\n[${timestamp}] ── Checking switches ──`);

  for (const sw of SWITCHES) {
    const reachable = await checkSwitch(sw);
    const state     = switchState[sw.id];

    if (!reachable && !state.isDown) {
      // ── Switch just went DOWN ──
      state.isDown = true;
      console.log(`  ❌ ${sw.name} went DOWN  → sending PROBLEM webhook`);
      await sendWebhook(sw, true);

    } else if (reachable && state.isDown) {
      // ── Switch came back UP ──
      state.isDown = false;
      console.log(`  ✅ ${sw.name} is UP again → sending RESOLVED webhook`);
      await sendWebhook(sw, false);

    } else {
      // ── No change ──
      console.log(`  ${reachable ? "✓" : "✗"} ${sw.name} — ${reachable ? "UP" : "still DOWN"}`);
    }
  }
}

// ─────────────────────────────────────────────
//  Start
// ─────────────────────────────────────────────
console.log("╔══════════════════════════════════════╗");
console.log("║   Virtual Switch Monitor (sim-Zabbix) ║");
console.log("╚══════════════════════════════════════╝");
console.log(`Backend URL    : ${BACKEND_URL}`);
console.log(`Check interval : ${CHECK_INTERVAL_MS / 1000} s`);
console.log(`Monitoring     : ${SWITCHES.map((s) => s.name).join(", ")}`);
console.log("");

monitorLoop();
setInterval(monitorLoop, CHECK_INTERVAL_MS);
