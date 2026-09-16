const express = require("express");

const { query } = require("../db");
const { emitInvalidation } = require("../utils/realtime");

const router = express.Router();

function normalizeSeverity(input) {
  if (!input) return "Medium";
  const value = input.toString().toLowerCase();
  if (value.includes("disaster") || value.includes("critical")) return "Critical";
  if (value.includes("high")) return "High";
  if (value.includes("average") || value.includes("warning") || value.includes("medium")) return "Medium";
  if (value.includes("info") || value.includes("information")) return "Low";
  return "Medium";
}

function isUnresolvedMacro(value) {
  const text = String(value || "").trim();
  if (!text) return true;
  return /^\{[A-Z0-9_.]+\}$/.test(text);
}

// Parse "Host: LAPTOP-M09LB17F" from alert_message text
function parseHostFromText(text) {
  const match = String(text || "").match(/^Host:\s*(.+)$/m);
  if (!match) return null;
  const val = match[1].trim();
  return val && !isUnresolvedMacro(val) ? val : null;
}

// Parse "Problem name: ..." from alert_message text
function parseProblemNameFromText(text) {
  const match = String(text || "").match(/^Problem name:\s*(.+?)(?:\r?\n|$)/m);
  if (!match) return null;
  return match[1].trim() || null;
}

function resolveDeviceName(payload) {
  // 1. Direct fields
  const directFields = [
    payload.host, payload.hostname, payload.host_name,
    payload.hosts?.[0]?.name, payload.host?.name, payload.event?.host,
  ];
  for (const f of directFields) {
    const v = String(f || "").trim();
    if (v && !isUnresolvedMacro(v)) return v;
  }

  // 2. Parse from alert_message text (real Zabbix format)
  const fromMsg = parseHostFromText(payload.alert_message);
  if (fromMsg) return fromMsg;

  return "Unknown-Host";
}

function extractProblemName(payload) {
  // 1. Direct named fields
  const directFields = [
    payload.name, payload.trigger_name, payload.event_name,
    payload.problem_name, payload.triggerName, payload.eventName,
  ];
  for (const f of directFields) {
    const v = String(f || "").trim();
    if (v && !isUnresolvedMacro(v)) return v;
  }

  // 2. Parse "Problem name: ..." from alert_message text (real Zabbix format)
  const fromMsg = parseProblemNameFromText(payload.alert_message);
  if (fromMsg) return fromMsg;

  // 3. Strip "Problem: " or "Resolved in Xm Ys: " prefix from alert_subject
  const subject = String(payload.alert_subject || payload.message || "").trim();
  if (subject) {
    const cleaned = subject
      .replace(/^(Problem:|Resolved in \d+m \d+s:|Resolved:)\s*/i, "")
      .trim();
    if (cleaned && !isUnresolvedMacro(cleaned)) return cleaned;
  }

  return null;
}

function resolveAlertId(payload) {
  const eventId =
    payload.eventid || payload.event_id || payload.event?.id || payload.event?.eventid;
  if (eventId) return `zbx-${eventId}`;
  return `zbx-${Date.now()}`;
}

function resolveStatus(payload) {
  const eventValue = payload.event_value ?? payload.eventValue ?? payload.value;
  const statusText =
    payload.status || payload.event_status || payload.eventStatus || payload.state;

  if (eventValue === 0 || eventValue === "0") return "Closed";
  if (typeof statusText === "string") {
    if (statusText.toLowerCase().includes("resolved")) return "Closed";
    if (statusText.toLowerCase().includes("ok")) return "Closed";
  }

  // Real Zabbix: detect from alert_subject
  const subject = String(payload.alert_subject || "").toLowerCase().trimStart();
  if (subject.startsWith("resolved")) return "Closed";
  if (subject.startsWith("problem")) return "EscalationQueue";

  return "EscalationQueue";
}

function toMySqlDateTime(date = new Date()) {
  return date.toISOString().slice(0, 19).replace("T", " ");
}

function parseJsonSafe(value) {
  if (typeof value !== "string") return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

async function sendDiscordAlert(deviceName, problemName, severity, status) {
  const discordUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!discordUrl) return;

  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:8081";
  const isDown = status === "EscalationQueue";
  const icon = isDown ? "🚨" : "✅";
  const statusLabel = isDown ? "PROBLEM" : "RESOLVED";

  const severityColors = {
    Critical: 0x9B0000,
    High:     0xFF0000,
    Medium:   0xFF8C00,
    Low:      0xFFD700,
  };
  const color = isDown ? (severityColors[severity] ?? 0xFF0000) : 0x00AA00;

  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const timeStr = `${pad(now.getUTCHours() + 7)}:${pad(now.getUTCMinutes())}:${pad(now.getUTCSeconds())}`;
  const dateStr = `${now.getUTCFullYear()}.${pad(now.getUTCMonth() + 1)}.${pad(now.getUTCDate())}`;

  const fullProblem = problemName || `${deviceName}: Unavailable by ICMP ping`;

  const description = isDown
    ? `Problem started at ${timeStr} on ${dateStr}\nProblem name: ${fullProblem}\nHost: ${deviceName}\nSeverity: ${severity}`
    : `Resolved at ${timeStr} on ${dateStr}\nProblem name: ${fullProblem}\nHost: ${deviceName}`;

  const fields = [
    { name: "🖥 Host",     value: deviceName, inline: true },
    { name: "📊 Severity", value: severity,   inline: true },
    {
      name: "🌐 OSD NOC System",
      value: `[เปิดหน้า Dashboard](${frontendUrl})`,
      inline: false,
    },
  ];

  if (isDown) {
    fields.push({
      name: "⚡ Quick Actions",
      value: `🖥 [เปิด Dashboard และรับงาน](${frontendUrl})`,
      inline: false,
    });
  }

  const embed = {
    title: `${icon} ${statusLabel}: ${fullProblem}`,
    color,
    description,
    fields,
    timestamp: new Date().toISOString(),
    footer: { text: "NOC System" },
  };

  try {
    const res = await fetch(discordUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ embeds: [embed] }),
    });
    console.log(`[DISCORD] ${icon} ${deviceName} → ${statusLabel} | HTTP ${res.status}`);
  } catch (err) {
    console.error(`[DISCORD ERROR] ${err.message}`);
  }
}

async function resolveQueueAssignee() {
  const rows = await query(
    `SELECT sq.id, sq.name
       FROM staff_queue sq
      WHERE sq.is_active = 1
        AND sq.status = 'Available'
      ORDER BY sq.queue_order ASC
      `,
  );

  if (rows.length === 0) {
    return { assignedTo: null, assignedName: null };
  }

  const resolvedQueue = [];
  for (const queueStaff of rows) {
    const userRows = await query(
      `SELECT id, full_name AS fullName
         FROM users
        WHERE LOWER(TRIM(username)) = LOWER(TRIM(?))
           OR LOWER(TRIM(full_name)) = LOWER(TRIM(?))
        LIMIT 1`,
      [queueStaff.name, queueStaff.name],
    );
    const user = userRows[0];
    resolvedQueue.push({
      queueId: queueStaff.id,
      queueName: queueStaff.name,
      assignedTo: user?.id || queueStaff.id,
      assignedName: user?.fullName || queueStaff.name,
    });
  }

  const latestRows = await query(
    `SELECT assigned_to AS assignedTo
       FROM alerts
      WHERE status = 'EscalationQueue'
        AND assigned_to IS NOT NULL
      ORDER BY created_at DESC
      LIMIT 1`,
  );
  const latestAssignedTo = String(latestRows[0]?.assignedTo || "").trim();

  let selected = resolvedQueue[0];
  if (latestAssignedTo) {
    const previousIndex = resolvedQueue.findIndex(
      (item) => item.assignedTo === latestAssignedTo || item.queueId === latestAssignedTo,
    );
    if (previousIndex >= 0) {
      selected = resolvedQueue[(previousIndex + 1) % resolvedQueue.length];
    }
  }

  return {
    assignedTo: selected.assignedTo,
    assignedName: selected.assignedName,
  };
}

router.post("/zabbix/webhook", async (req, res) => {
  try {
    const token = process.env.ZABBIX_WEBHOOK_TOKEN;
    const bearer = String(req.headers.authorization || "");
    const bearerToken = bearer.startsWith("Bearer ")
      ? bearer.slice(7).trim()
      : "";
    const providedToken =
      req.headers["x-zabbix-token"] ||
      bearerToken ||
      req.query.token ||
      req.body?.token;

    if (token && providedToken !== token) {
      return res.status(401).json({
        message: "Unauthorized",
        hint: "Provide valid x-zabbix-token header, Bearer token, query token, or body token",
      });
    }

    const rawPayload = req.body || {};
    const messagePayload = parseJsonSafe(rawPayload.message);
    const payload = messagePayload
      ? { ...rawPayload, ...messagePayload }
      : rawPayload;
    const alertId = resolveAlertId(payload);
    const hasStableId = !alertId.startsWith("zbx-") || !/zbx-\d{13,}/.test(alertId);
    const deviceName = await resolveDeviceName(payload);
    const problemName = extractProblemName(payload);
    const severity = normalizeSeverity(
      payload.severity ||
        payload.severity_name ||
        payload.trigger_severity ||
        payload.triggerSeverity ||
        payload.event_severity,
    );
    const status = resolveStatus(payload);
    const assignee =
      status === "EscalationQueue"
        ? await resolveQueueAssignee()
        : { assignedTo: null, assignedName: null };

    // When no stable eventid, check for existing active alert for same device to avoid duplicates
    if (!hasStableId && status === "EscalationQueue") {
      const dupRows = await query(
        "SELECT id FROM alerts WHERE device_name = ? AND status IN ('EscalationQueue', 'ClaimPool') LIMIT 1",
        [deviceName],
      );
      if (dupRows.length > 0) {
        emitInvalidation(["alerts", "dashboard"], "zabbix.alert.deduplicated");
        return res.json({ message: "Duplicate alert suppressed", id: dupRows[0].id });
      }
    }

    const existing = await query("SELECT id FROM alerts WHERE id = ?", [
      alertId,
    ]);

    if (existing.length > 0) {
      if (status === "EscalationQueue") {
        const posRows = await query(
          "SELECT COALESCE(MAX(queue_position), 0) + 1 AS nextPos FROM alerts WHERE status = 'EscalationQueue'",
        );
        const queuePosition = posRows[0]?.nextPos || 1;
        await query(
          "UPDATE alerts SET device_name = ?, problem_name = ?, severity = ?, status = ?, assigned_to = ?, assigned_name = ?, created_at = UTC_TIMESTAMP(), queue_position = ? WHERE id = ?",
          [deviceName, problemName, severity, status, assignee.assignedTo, assignee.assignedName, queuePosition, alertId],
        );
      } else {
        await query(
          "UPDATE alerts SET device_name = ?, problem_name = ?, severity = ?, status = ?, assigned_to = ?, assigned_name = ? WHERE id = ?",
          [deviceName, problemName, severity, status, assignee.assignedTo, assignee.assignedName, alertId],
        );
      }

      emitInvalidation(["alerts", "dashboard"], "zabbix.alert.updated");
      sendDiscordAlert(deviceName, problemName, severity, status);

      return res.json({ message: "Alert updated", id: alertId });
    }

    let queuePosition = null;
    if (status === "EscalationQueue") {
      const posRows = await query(
        "SELECT COALESCE(MAX(queue_position), 0) + 1 AS nextPos FROM alerts WHERE status = 'EscalationQueue'",
      );
      queuePosition = posRows[0]?.nextPos || 1;
    }

    console.log("📝 Inserting alert:", { alertId, deviceName, problemName, severity, status });
    await query(
      "INSERT INTO alerts (id, device_name, problem_name, severity, status, assigned_to, assigned_name, queue_position, created_at, response_started_at, diagnosis, fix_method) VALUES (?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(), ?, ?, ?)",
      [
        alertId,
        deviceName,
        problemName,
        severity,
        status,
        assignee.assignedTo,
        assignee.assignedName,
        queuePosition,
        null,
        "",
        "",
      ],
    );
    console.log("✅ Alert inserted successfully!");

    emitInvalidation(["alerts", "dashboard"], "zabbix.alert.created");
    sendDiscordAlert(deviceName, problemName, severity, status);

    res.json({ message: "Alert received", id: alertId });
  } catch (error) {
    console.error("❌ Zabbix webhook error:", error);
    res.status(500).json({ message: "Database error", error: error.message });
  }
});

router.get("/zabbix/problems", async (req, res) => {
  try {
    // Get Zabbix settings from database
    const settingsRows = await query(
      "SELECT api_url AS apiUrl, api_token AS apiToken FROM zabbix_link WHERE id = 1",
    );
    const zabbixUrl = settingsRows[0]?.apiUrl || process.env.ZABBIX_API_URL || "http://192.168.56.110/api_jsonrpc.php";
    const zabbixToken = settingsRows[0]?.apiToken || process.env.ZABBIX_API_TOKEN || "d5144844d2325743ae09eede597fb44b";

    const response = await fetch(zabbixUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json-rpc",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "problem.get",
        params: { output: "extend" },
        auth: zabbixToken,
        id: 1,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    return res.json(data);
  } catch (error) {
    console.error("❌ Zabbix problems proxy error:", error);
    return res.status(500).json({ message: "Failed to fetch Zabbix problems", error: error.message });
  }
});

module.exports = router;
