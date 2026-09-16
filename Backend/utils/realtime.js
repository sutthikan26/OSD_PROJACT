const clients = new Map();

let nextClientId = 1;

function sendEvent(client, eventName, payload) {
  if (!client || client.res.writableEnded) {
    return;
  }

  client.res.write(`event: ${eventName}\n`);
  client.res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

function registerRealtimeClient(req, res) {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  if (typeof res.flushHeaders === "function") {
    res.flushHeaders();
  }

  const clientId = `rt-${nextClientId++}`;
  const client = {
    id: clientId,
    userId: String(req.query.userId || req.headers["x-user-id"] || ""),
    role: String(req.query.role || req.headers["x-role"] || "user"),
    res,
  };

  clients.set(clientId, client);
  res.write("retry: 5000\n\n");
  sendEvent(client, "connected", {
    type: "connected",
    clientId,
    timestamp: new Date().toISOString(),
  });

  const heartbeat = setInterval(() => {
    if (!res.writableEnded) {
      res.write(": keepalive\n\n");
    }
  }, 25000);

  const cleanup = () => {
    clearInterval(heartbeat);
    clients.delete(clientId);
  };

  res.on("close", cleanup);
  return cleanup;
}

function emitInvalidation(channels, reason, extra = {}) {
  const uniqueChannels = [...new Set((channels || []).filter(Boolean))];
  if (uniqueChannels.length === 0) {
    return;
  }

  const payload = {
    type: "invalidate",
    channels: uniqueChannels,
    reason,
    timestamp: new Date().toISOString(),
    ...extra,
  };

  for (const client of clients.values()) {
    sendEvent(client, "invalidate", payload);
  }
}

module.exports = {
  registerRealtimeClient,
  emitInvalidation,
};