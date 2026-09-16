require("dotenv").config();
const express = require("express");
const cors = require("cors");

const healthRoutes = require("./routes/health");
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const dashboardRoutes = require("./routes/dashboard");
const alertRoutes = require("./routes/alerts");
const repairRoutes = require("./routes/repairs");
const queueRoutes = require("./routes/queue");
const historyRoutes = require("./routes/history");
const slaRoutes = require("./routes/sla");
const inventoryRoutes = require("./routes/inventory");
const notificationRoutes = require("./routes/notifications");
const maintenanceRoutes = require("./routes/maintenance");
const zabbixRoutes = require("./routes/zabbix");
const customersRoutes = require("./routes/customers");
const zabbixLinkRoutes = require("./routes/zabbix-link");
const eventsRoutes = require("./routes/events");

const app = express();
const PORT = Number(process.env.PORT || 4000);

app.use(cors());
app.use(express.json({ charset: "utf8mb4" }));
app.use((req, res, next) => {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  next();
});

app.use("/api", healthRoutes);
app.use("/api", authRoutes);
app.use("/api", userRoutes);
app.use("/api", dashboardRoutes);
app.use("/api", alertRoutes);
app.use("/api", repairRoutes);
app.use("/api", queueRoutes);
app.use("/api", historyRoutes);
app.use("/api", slaRoutes);
app.use("/api", inventoryRoutes);
app.use("/api", notificationRoutes);
app.use("/api", maintenanceRoutes);
app.use("/api", zabbixRoutes);
app.use("/api", customersRoutes);
app.use("/api", zabbixLinkRoutes);
app.use("/api", eventsRoutes);

app.listen(PORT, () => {
  console.log(`OSD NOC API running at http://localhost:${PORT}`);
});
