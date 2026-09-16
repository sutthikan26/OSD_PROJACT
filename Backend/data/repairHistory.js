const repairHistory = [
  {
    id: "h-001",
    alertId: "a-old-001",
    deviceName: "SW-Access-77",
    staffId: "u-admin-01",
    staffName: "NOC Admin",
    rootCause: "Fiber Link",
    fixMethod: "Re-terminate fiber connector",
    mttrMinutes: 18,
    queueMissed: false,
    closedAt: "2026-02-23T05:40:00.000Z",
  },
  {
    id: "h-002",
    alertId: "a-old-002",
    deviceName: "RTR-CNX-03",
    staffId: "u-super-01",
    staffName: "NOC Super Admin",
    rootCause: "Configuration Drift",
    fixMethod: "Restore baseline config",
    mttrMinutes: 26,
    queueMissed: true,
    closedAt: "2026-02-24T08:20:00.000Z",
  },
];

module.exports = repairHistory;
