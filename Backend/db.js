const mysql = require("mysql2/promise");

const useMock = process.env.USE_MOCK_DATA === "true";
let pool = null;
let poolReady = false;

if (!useMock) {
  const dbConfig = {
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "noc_db",
    waitForConnections: true,
    connectionLimit: Number(process.env.DB_POOL_SIZE || 10),
    timezone: "Z",
    charset: "utf8mb4",
  };

  console.log(`🔌 Attempting MySQL connection to ${dbConfig.user}@${dbConfig.host}:${dbConfig.port}/${dbConfig.database}...`);

  pool = mysql.createPool(dbConfig);

  pool.getConnection()
    .then((conn) => {
      conn.release();
      poolReady = true;
      console.log("✅ MySQL connected successfully! Pool is ready.");
    })
    .catch((err) => {
      console.error("❌ MySQL connection failed:", err.message);
      pool = null;
      poolReady = false;
    });
} else {
  console.log("🟡 Running in MOCK DATA mode (No MySQL required)");
}

const alertsSeed = require("./data/alerts");
const inventorySeed = require("./data/inventory");
const maintenanceSeed = require("./data/maintenancePlans");
const notificationSeed = require("./data/notificationSettings");
const repairHistorySeed = require("./data/repairHistory");
const staffQueueSeed = require("./data/staffQueue");
const usersSeed = require("./data/users");

const mockData = {
  alerts: alertsSeed.map((item) => ({ ...item })),
  inventory: inventorySeed.map((item) => ({ ...item })),
  maintenancePlans: maintenanceSeed.map((item) => ({ ...item })),
  notificationSettings: { ...notificationSeed },
  repairHistory: repairHistorySeed.map((item) => ({ ...item })),
  staffQueue: staffQueueSeed.map((item) => ({ ...item })),
  users: usersSeed.map((item) => ({ ...item })),
};

function mapAlert(alert) {
  return {
    id: alert.id,
    deviceName: alert.deviceName,
    device_name: alert.deviceName,
    severity: alert.severity,
    status: alert.status,
    assignedTo: alert.assignedTo ?? null,
    assigned_to: alert.assignedTo ?? null,
    queuePosition: alert.queuePosition ?? null,
    queue_position: alert.queuePosition ?? null,
    createdAt: alert.createdAt,
    created_at: alert.createdAt,
    responseStartedAt: alert.responseStartedAt ?? null,
    response_started_at: alert.responseStartedAt ?? null,
    diagnosis: alert.diagnosis || "",
    fixMethod: alert.fixMethod || "",
    fix_method: alert.fixMethod || "",
    closedAt: alert.closedAt ?? null,
    closed_at: alert.closedAt ?? null,
  };
}

function mapInventory(item) {
  return {
    id: item.id,
    deviceName: item.deviceName,
    device_name: item.deviceName,
    serialNumber: item.serialNumber,
    serial_number: item.serialNumber,
    ipAddress: item.ipAddress || "",
    ip_address: item.ipAddress || null,
    warrantyUntil: item.warrantyUntil,
    warranty_until: item.warrantyUntil,
    location: item.location,
  };
}

function mapStaff(item) {
  return {
    id: item.id,
    name: item.name,
    role: item.role,
    isActive: item.isActive,
    is_active: item.isActive ? 1 : 0,
    status: item.status,
    currentDevice: item.currentDevice ?? null,
    current_device: item.currentDevice ?? null,
    currentTicketId: item.currentTicketId ?? null,
    current_ticket_id: item.currentTicketId ?? null,
    lastResponseSeconds: item.lastResponseSeconds ?? 0,
    last_response_seconds: item.lastResponseSeconds ?? 0,
    queueOrder: item.queueOrder ?? 0,
    queue_order: item.queueOrder ?? 0,
  };
}

function mapHistory(item) {
  return {
    id: item.id,
    alertId: item.alertId,
    alert_id: item.alertId,
    deviceName: item.deviceName,
    device_name: item.deviceName,
    staffId: item.staffId,
    staff_id: item.staffId,
    staffName: item.staffName,
    staff_name: item.staffName,
    rootCause: item.rootCause,
    root_cause: item.rootCause,
    fixMethod: item.fixMethod,
    fix_method: item.fixMethod,
    mttrMinutes: item.mttrMinutes,
    mttr_minutes: item.mttrMinutes,
    queueMissed: item.queueMissed,
    queue_missed: item.queueMissed,
    closedAt: item.closedAt,
    closed_at: item.closedAt,
  };
}

function mapUser(user) {
  return {
    id: user.id,
    username: user.username,
    password: user.password,
    role: user.role,
    name: user.name,
    full_name: user.name,
  };
}

function parseRole(value) {
  return value === "admin" ? "admin" : "user";
}

function mockQuery(sql, params = []) {
  const lowerSql = sql.toLowerCase();

  if (lowerSql.startsWith("select") && lowerSql.includes("from users")) {
    if (lowerSql.includes("where username")) {
      const [username, password] = params;
      return mockData.users
        .filter(
          (u) => u.username === username && (password ? u.password === password : true),
        )
        .map(mapUser);
    }
    if (lowerSql.includes("lower(username)")) {
      const [username] = params;
      const normalized = String(username || "").toLowerCase();
      return mockData.users
        .filter((u) => u.username.toLowerCase() === normalized)
        .map(mapUser);
    }
    if (lowerSql.includes("where id")) {
      const [id] = params;
      return mockData.users.filter((u) => u.id === id).map(mapUser);
    }
    return mockData.users
      .map(mapUser)
      .sort((a, b) => a.full_name.localeCompare(b.full_name));
  }

  if (lowerSql.startsWith("insert into users")) {
    const [id, name, username, password, role] = params;
    mockData.users.push({
      id: String(id || `u-${Date.now()}`),
      name: String(name || "").trim(),
      username: String(username || "").trim(),
      password: String(password || ""),
      role: parseRole(role),
      mustChangePassword: 0,
    });
    return { insertId: id };
  }

  if (lowerSql.startsWith("update users")) {
    const targetId = params[params.length - 1];
    const user = mockData.users.find((u) => u.id === targetId);
    if (!user) return { affectedRows: 0 };
    if (lowerSql.includes("must_change_password")) {
      const [newPassword, mustChange] = params;
      user.password = String(newPassword || user.password);
      user.mustChangePassword = mustChange;
    } else if (lowerSql.includes("password")) {
      const [newPassword] = params;
      user.password = String(newPassword || user.password);
    } else if (lowerSql.includes("role")) {
      const [newRole] = params;
      user.role = parseRole(newRole);
    }
    return { affectedRows: 1 };
  }

  if (lowerSql.startsWith("select") && lowerSql.includes("from inventory")) {
    if (lowerSql.includes("where id")) {
      const [id] = params;
      return mockData.inventory.filter((i) => i.id === id).map(mapInventory);
    }
    return mockData.inventory.map(mapInventory);
  }

  if (lowerSql.startsWith("update inventory")) {
    const [serialNumber, ipAddress, warrantyUntil, location, id] = params;
    const item = mockData.inventory.find((i) => i.id === id);
    if (item) {
      item.serialNumber = serialNumber ?? item.serialNumber;
      item.ipAddress = ipAddress ?? item.ipAddress;
      item.warrantyUntil = warrantyUntil ?? item.warrantyUntil;
      item.location = location ?? item.location;
    }
    return { affectedRows: item ? 1 : 0 };
  }

  if (lowerSql.startsWith("select") && lowerSql.includes("from alerts")) {
    if (lowerSql.includes("where status = 'escalationqueue'")) {
      return mockData.alerts
        .filter((a) => a.status === "EscalationQueue")
        .map(mapAlert)
        .sort((a, b) => (a.queuePosition || 0) - (b.queuePosition || 0));
    }
    if (lowerSql.includes("where status = 'claimpool'")) {
      return mockData.alerts
        .filter((a) => a.status === "ClaimPool")
        .map(mapAlert);
    }
    if (lowerSql.includes("where id = ?")) {
      const [id] = params;
      return mockData.alerts.filter((a) => a.id === id).map(mapAlert);
    }
    if (lowerSql.includes("coalesce(max(queue_position)")) {
      const max = mockData.alerts
        .filter((a) => a.status === "EscalationQueue")
        .reduce((acc, a) => Math.max(acc, a.queuePosition || 0), 0);
      return [{ nextPos: max + 1 }];
    }
    return mockData.alerts.map(mapAlert);
  }

  if (lowerSql.startsWith("insert into alerts")) {
    const [id, deviceName, severity, status, assignedTo, queuePosition, createdAt, responseStartedAt, diagnosis, fixMethod, closedAt] = params;
    mockData.alerts.push({
      id,
      deviceName,
      severity,
      status,
      assignedTo: assignedTo ?? null,
      queuePosition: queuePosition ?? null,
      createdAt,
      responseStartedAt: responseStartedAt ?? null,
      diagnosis: diagnosis || "",
      fixMethod: fixMethod || "",
      closedAt: closedAt ?? null,
    });
    return { affectedRows: 1 };
  }

  if (lowerSql.startsWith("update alerts")) {
    const targetId = params[params.length - 1];
    const alert = mockData.alerts.find((a) => a.id === targetId);
    if (!alert) return { affectedRows: 0 };
    if (lowerSql.includes("status = 'inprogress'")) {
      const [assignedTo, assignedName, responseStartedAt] = params;
      alert.status = "InProgress";
      alert.assignedTo = assignedTo ?? alert.assignedTo;
      alert.assignedName = assignedName ?? alert.assignedName;
      alert.responseStartedAt = responseStartedAt ?? alert.responseStartedAt;
    } else if (lowerSql.includes("status = 'closed'")) {
      const [closedAt] = params;
      alert.status = "Closed";
      alert.closedAt = closedAt ?? alert.closedAt;
    } else if (lowerSql.includes("diagnosis")) {
      const [diagnosis, fixMethod] = params;
      alert.diagnosis = diagnosis ?? alert.diagnosis;
      alert.fixMethod = fixMethod ?? alert.fixMethod;
    } else if (lowerSql.includes("device_name")) {
      const [deviceName, severity, status, closedAt] = params;
      alert.deviceName = deviceName ?? alert.deviceName;
      alert.severity = severity ?? alert.severity;
      alert.status = status ?? alert.status;
      alert.closedAt = closedAt ?? alert.closedAt;
    }
    return { affectedRows: 1 };
  }

  if (lowerSql.startsWith("select") && lowerSql.includes("from staff_queue")) {
    return mockData.staffQueue
      .map(mapStaff)
      .sort((a, b) => a.queueOrder - b.queueOrder);
  }

  if (lowerSql.startsWith("delete from staff_queue")) {
    mockData.staffQueue = [];
    return { affectedRows: 1 };
  }

  if (lowerSql.startsWith("insert into staff_queue")) {
    const [id, name, role, isActive, status, currentDevice, currentTicketId, lastResponseSeconds, queueOrder] = params;
    mockData.staffQueue.push({
      id,
      name,
      role: parseRole(role),
      isActive: Boolean(isActive),
      status,
      currentDevice: currentDevice ?? null,
      currentTicketId: currentTicketId ?? null,
      lastResponseSeconds: Number(lastResponseSeconds || 0),
      queueOrder: Number(queueOrder || 0),
    });
    return { affectedRows: 1 };
  }

  if (lowerSql.startsWith("update staff_queue")) {
    const targetId = params[params.length - 1];
    const staff = mockData.staffQueue.find((s) => s.id === targetId);
    if (!staff) return { affectedRows: 0 };
    if (lowerSql.includes("status = 'busy'")) {
      const [currentDevice, currentTicketId, lastResponseSeconds] = params;
      staff.status = "Busy";
      staff.currentDevice = currentDevice ?? staff.currentDevice;
      staff.currentTicketId = currentTicketId ?? staff.currentTicketId;
      staff.lastResponseSeconds = Number(lastResponseSeconds || 0);
    } else if (lowerSql.includes("status = 'available'")) {
      staff.status = "Available";
      staff.currentDevice = null;
      staff.currentTicketId = null;
    }
    return { affectedRows: 1 };
  }

  if (lowerSql.startsWith("select") && lowerSql.includes("from repair_history")) {
    if (lowerSql.includes("where device_name = ? or root_cause = ?")) {
      const [deviceName, rootCause] = params;
      return mockData.repairHistory
        .filter(
          (item) =>
            item.deviceName === deviceName ||
            (rootCause && item.rootCause === rootCause),
        )
        .map(mapHistory)
        .sort((a, b) => new Date(b.closedAt).getTime() - new Date(a.closedAt).getTime())
        .slice(0, 5);
    }

    let filtered = mockData.repairHistory;
    if (lowerSql.includes("where staff_id = ?")) {
      const [staffId] = params;
      filtered = filtered.filter((item) => item.staffId === staffId);
      if (params.length >= 3) {
        const [_, search1] = params;
        const search = String(search1 || "").replace(/%/g, "").toLowerCase();
        if (search) {
          filtered = filtered.filter(
            (item) =>
              item.deviceName.toLowerCase().includes(search) ||
              item.staffName.toLowerCase().includes(search),
          );
        }
      }
    } else if (lowerSql.includes("where (lower(device_name)")) {
      const [search1] = params;
      const search = String(search1 || "").replace(/%/g, "").toLowerCase();
      if (search) {
        filtered = filtered.filter(
          (item) =>
            item.deviceName.toLowerCase().includes(search) ||
            item.staffName.toLowerCase().includes(search),
        );
      }
    }

    return filtered
      .map(mapHistory)
      .sort((a, b) => new Date(b.closedAt).getTime() - new Date(a.closedAt).getTime());
  }

  if (lowerSql.startsWith("insert into repair_history")) {
    const [id, alertId, deviceName, staffId, staffName, rootCause, fixMethod, mttrMinutes, queueMissed, closedAt] = params;
    mockData.repairHistory.push({
      id,
      alertId,
      deviceName,
      staffId,
      staffName,
      rootCause,
      fixMethod,
      mttrMinutes: Number(mttrMinutes || 0),
      queueMissed: Boolean(queueMissed),
      closedAt,
    });
    return { affectedRows: 1 };
  }

  if (lowerSql.startsWith("select") && lowerSql.includes("from maintenance_plans")) {
    return mockData.maintenancePlans
      .map((item) => ({
        id: item.id,
        title: item.title,
        start: item.start,
        start_at: item.start,
        end: item.end,
        end_at: item.end,
        pauseZabbixAlert: item.pauseZabbixAlert,
        pause_zabbix_alert: item.pauseZabbixAlert ? 1 : 0,
        createdBy: item.createdBy,
        created_by: item.createdBy,
      }))
      .sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime());
  }

  if (lowerSql.startsWith("insert into maintenance_plans")) {
    const [id, title, start, end, pauseZabbixAlert, createdBy] = params;
    mockData.maintenancePlans.unshift({
      id,
      title,
      start,
      end,
      pauseZabbixAlert: Boolean(pauseZabbixAlert),
      createdBy,
    });
    return { affectedRows: 1 };
  }

  if (lowerSql.startsWith("select") && lowerSql.includes("from notification_settings")) {
    const item = mockData.notificationSettings;
    if (!item) return [];
    return [
      {
        lineNotify: item.lineNotify,
        line_notify: item.lineNotify ? 1 : 0,
        telegram: item.telegram,
        minSeverity: item.minSeverity,
        min_severity: item.minSeverity,
        receivers: item.receivers,
      },
    ];
  }

  if (lowerSql.startsWith("insert into notification_settings")) {
    const [lineNotify, telegram, minSeverity, receivers] = params;
    mockData.notificationSettings = {
      lineNotify: Boolean(lineNotify),
      telegram: Boolean(telegram),
      minSeverity: minSeverity || "High",
      receivers: Array.isArray(receivers) ? receivers : JSON.parse(receivers || "[]"),
    };
    return { affectedRows: 1 };
  }

  return [];
}

async function query(sql, params = []) {
  if (useMock) {
    return mockQuery(sql, params);
  }

  if (pool) {
    let retries = 0;
    while (!poolReady && retries < 50) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      retries++;
    }

    if (!poolReady) {
      throw new Error("Database pool is not ready after 5 seconds");
    }

    const [rows] = await pool.execute(sql, params);
    return rows;
  }

  throw new Error("Database is not available");
}

module.exports = {
  pool,
  query,
};