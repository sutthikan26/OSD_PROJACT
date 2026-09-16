import type { DashboardData } from "../../types";
import {
  Activity,
  AlertTriangle,
  BrainCircuit,
  HardDrive,
  Timer,
  Users,
} from "lucide-react";
import {
  getCategoryLabel,
  getRootCauseParentCategory,
} from "../constants";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import "./DashboardPage.css";

interface DashboardPageProps {
  dashboard: DashboardData;
  language: "th" | "en";
  lastUpdatedAt: number | null;
  realtimeConnected: boolean;
  realtimeEventLog: Array<{
    at: number;
    eventType: string;
    reason?: string;
    channels?: string[];
  }>;
  onNavigateToHistory?: (category: string) => void;
}

const RCA_PALETTE = ["#d9534f", "#f0ad4e", "#5bc0de", "#5cb85c", "#7a8ca8", "#9b59b6", "#e67e22"];

function DashboardPage({
  dashboard,
  language,
  lastUpdatedAt,
  realtimeConnected,
  realtimeEventLog,
  onNavigateToHistory,
}: DashboardPageProps) {
  const th = language === "th";
  const healthTone =
    dashboard.healthStatusPercent >= 95
      ? "excellent"
      : dashboard.healthStatusPercent >= 60
        ? "good"
        : "warning";

  // Group RCA chart items by parent category (network/server/application/...)
  const groupedRcaChart = (() => {
    const grouped: Record<string, number> = {};
    dashboard.rcaChart.forEach((item) => {
      const category = getRootCauseParentCategory(item.cause);
      grouped[category] = (grouped[category] || 0) + item.count;
    });
    return Object.entries(grouped)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);
  })();

  const rcaTotal = Math.max(
    1,
    groupedRcaChart.reduce((sum, item) => sum + item.count, 0),
  );

  const pieGradient = (() => {
    let start = 0;
    const parts = groupedRcaChart.map((item, index) => {
      const percent = (item.count / rcaTotal) * 100;
      const end = start + percent;
      const color = RCA_PALETTE[index % RCA_PALETTE.length];
      const chunk = `${color} ${start.toFixed(2)}% ${end.toFixed(2)}%`;
      start = end;
      return chunk;
    });
    return `conic-gradient(${parts.join(", ")})`;
  })();

  const chartData = dashboard.mttrTrendDaily.map((item) => ({
    day: item.day,
    mttrMinutes: item.mttrMinutes > 0 ? item.mttrMinutes : null,
    incidentCount: item.incidentCount || 0,
  }));

  const severityItems = [
    {
      key: th ? "วิกฤต" : "Critical",
      value: dashboard.alertSeverityBreakdown.critical,
      className: "critical",
    },
    {
      key: th ? "สูง" : "High",
      value: dashboard.alertSeverityBreakdown.high,
      className: "high",
    },
    {
      key: th ? "เตือน" : "Warning",
      value: dashboard.alertSeverityBreakdown.warning,
      className: "medium",
    },
    {
      key: th ? "ข้อมูล" : "Info",
      value: dashboard.alertSeverityBreakdown.info,
      className: "low",
    },
  ];

  const healthLabel = th
    ? healthTone === "excellent"
      ? "ดีเยี่ยม"
      : healthTone === "good"
        ? "ดี"
        : "ต้องเฝ้าระวัง"
    : healthTone.toUpperCase();

  const lastUpdatedText = lastUpdatedAt
    ? new Date(lastUpdatedAt).toLocaleTimeString()
    : th
      ? "ยังไม่มีข้อมูล"
      : "No data yet";

  return (
    <section className="grid-2 dashboard-page">
      <article className="card">
        <h3 className="section-title">
          <span>
            <Activity size={16} />
          </span>
          {th ? "สถานะระบบ" : "Health Status"}
        </h3>
        <div className="gauge-wrap">
          <div
            className="availability-gauge"
            style={{
              background: `conic-gradient(#2f62b6 ${(dashboard.availabilityGauge.percent / 100) * 360}deg, #e4ebf6 0deg)`,
            }}
          >
            <div className="gauge-inner">
              {dashboard.availabilityGauge.percent}%
            </div>
          </div>
        </div>
        <span className={`health-chip ${healthTone}`}>{healthLabel}</span>
        <p className="muted">
          {th ? "ใช้งานได้ปกติ" : "Healthy"}{" "}
          {dashboard.availabilityGauge.healthyHosts} /{" "}
          {dashboard.availabilityGauge.totalHosts} Hosts
        </p>
        <div className="realtime-meta">
          <div>
            {th ? "อัปเดตล่าสุด" : "Last updated"}: {lastUpdatedText}
          </div>
          <div>
            {th ? "สตรีม" : "Stream"}:{" "}
            <span
              className={`stream-status ${
                realtimeConnected ? "connected" : "disconnected"
              }`}
            >
              {realtimeConnected
                ? th
                  ? "เชื่อมต่อ"
                  : "Connected"
                : th
                  ? "ขาดการเชื่อมต่อ"
                  : "Disconnected"}
            </span>
          </div>
        </div>
      </article>

      <article className="card">
        <h3 className="section-title">
          <span>
            <AlertTriangle size={16} />
          </span>
          {th ? "สรุปผลกระทบแจ้งเตือน" : "Alert Impact Breakdown"}
        </h3>
        <div className="severity-grid">
          {severityItems.map((severity) => (
            <div key={severity.key} className="severity-box">
              <p className="muted">{severity.key}</p>
              <p className={`severity-value ${severity.className}`}>
                {severity.value}
              </p>
            </div>
          ))}
        </div>
      </article>

      <article className="card">
        <h3 className="section-title">
          <span>
            <Users size={16} />
          </span>
          {th ? "สถานะพนักงาน" : "Staff Status Monitor"}
        </h3>
        <ul className="list staff-list">
          {dashboard.staffStatus.map((staff) => {
            const totalMinutes = staff.lastResponseSeconds / 60;
            const formatDuration = (mins: number) => {
              if (mins >= 1440) {
                const d = (mins / 1440).toFixed(1);
                return th ? `${d} วัน` : `${d} day${parseFloat(d) !== 1 ? "s" : ""}`;
              } else if (mins >= 60) {
                const h = (mins / 60).toFixed(1);
                return th ? `${h} ชั่วโมง` : `${h} hr${parseFloat(h) !== 1 ? "s" : ""}`;
              }
              return th ? `${mins.toFixed(1)} นาที` : `${mins.toFixed(1)} min`;
            };
            const responseText = formatDuration(totalMinutes);
            const outSla = staff.lastResponseSeconds > 300;
            const statusClass =
              staff.status === "Available"
                ? "ok"
                : staff.status === "Busy"
                  ? "busy"
                  : "offline";
            return (
              <li key={staff.id}>
                <div className="staff-row">
                  <strong>{staff.name}</strong>
                  <span className={`status-chip ${statusClass}`}>
                    {th
                      ? staff.status === "Available"
                        ? "พร้อม"
                        : staff.status === "Busy"
                          ? "ไม่ว่าง"
                          : "ออฟไลน์"
                      : staff.status}
                  </span>
                </div>
                <p className="muted staff-detail">
                  {staff.status === "Busy"
                    ? `${th ? "กำลังดูแล" : "Live"}: ${staff.currentDevice || "-"} / ${th ? "ทิกเก็ต" : "Ticket"}: ${staff.currentTicketId || "-"}`
                    : `${th ? "กำลังดูแล" : "Live"}: -`}
                </p>
                <p className={`staff-response ${outSla ? "late" : "on-time"}`}>
                  {th
                    ? staff.status === "Busy"
                      ? "ใช้เวลาตอบสนอง"
                      : "เข้าเว็บล่าสุด"
                    : staff.status === "Busy"
                      ? "Response time"
                      : "Last web access"}
                  : {responseText}
                </p>
              </li>
            );
          })}
        </ul>
      </article>

      <article className="card">
        <h3 className="section-title">
          <span>
            <BrainCircuit size={16} />
          </span>
          {th ? "วิเคราะห์สาเหตุหลัก (Pie)" : "Root Cause Analysis (Pie)"}
        </h3>
        <div className="rca-layout">
          <div className="rca-pie" style={{ background: pieGradient }} />
          <div className="rca-legend">
            {groupedRcaChart.map((item, index) => (
              <div
                key={item.category}
                className={`legend-item${onNavigateToHistory ? " clickable" : ""}`}
                onClick={() => onNavigateToHistory?.(item.category)}
                title={
                  onNavigateToHistory
                    ? th
                      ? "คลิกเพื่อดูรายละเอียดในประวัติการซ่อม"
                      : "Click to view in repair history"
                    : undefined
                }
              >
                <div className="legend-item-label">
                  <span
                    className="legend-dot"
                    style={{ background: RCA_PALETTE[index % RCA_PALETTE.length] }}
                  />
                  <span>{getCategoryLabel(item.category, th ? "th" : "en")}</span>
                </div>
                <strong>{item.count}</strong>
              </div>
            ))}
          </div>
        </div>
      </article>

      <article className="card full-width">
        <h3 className="section-title">
          <span>
            <Timer size={16} />
          </span>
          {th
            ? "แนวโน้ม MTTR + 5 อุปกรณ์ที่ได้รับผลกระทบสูงสุด"
            : "MTTR Trend + Top 5 Affected Assets"}
        </h3>
        <div className="dashboard-split">
          <div className="trend-panel">
            <p className="muted">
              {th
                ? "เวลาซ่อมเฉลี่ย (นาที/วัน)"
                : "Mean Time To Repair (minutes/day)"}
            </p>
            <div className="trend-chart-shell">
              <ResponsiveContainer width="100%" height={220}>
                <ComposedChart
                  data={chartData}
                  margin={{ top: 12, right: 18, left: 8, bottom: 8 }}
                >
                  <CartesianGrid stroke="#e1e9f6" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="day"
                    tick={{ fill: "#6b7c94", fontSize: 12 }}
                    axisLine={{ stroke: "#9cafcf" }}
                    tickLine={{ stroke: "#9cafcf" }}
                  />
                  <YAxis
                    yAxisId="mttr"
                    domain={[0, 'auto']}
                    tick={{ fill: "#6b7c94", fontSize: 12 }}
                    axisLine={{ stroke: "#9cafcf" }}
                    tickLine={{ stroke: "#9cafcf" }}
                    allowDecimals={false}
                  />
                  <YAxis
                    yAxisId="cases"
                    orientation="right"
                    tick={{ fill: "#6b7c94", fontSize: 12 }}
                    axisLine={{ stroke: "#9cafcf" }}
                    tickLine={{ stroke: "#9cafcf" }}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      border: "1px solid #dbe2ee",
                      borderRadius: 6,
                      background: "#ffffff",
                    }}
                    formatter={(value, name) => {
                      const numericValue = Number(value ?? 0);
                      if (name === "mttrMinutes") {
                        return [
                          `${numericValue} ${th ? "นาที" : "min"}`,
                          th ? "MTTR" : "MTTR",
                        ];
                      }
                      return [
                        `${numericValue}`,
                        th ? "จำนวนเคส" : "Incident Count",
                      ];
                    }}
                    labelFormatter={(label) => `${label}`}
                  />
                  <Legend
                    formatter={(value) =>
                      value === "mttrMinutes"
                        ? th
                          ? "MTTR (แท่ง)"
                          : "MTTR (Bar)"
                        : th
                          ? "จำนวนเคส (เส้น)"
                          : "Incident Count (Line)"
                    }
                  />
                  <Bar
                    yAxisId="mttr"
                    dataKey="mttrMinutes"
                    fill="#4f79bf"
                    radius={[3, 3, 0, 0]}
                    maxBarSize={28}
                  />
                  <Line
                    yAxisId="cases"
                    type="monotone"
                    dataKey="incidentCount"
                    stroke="#1f3f7a"
                    strokeWidth={3}
                    dot={{ r: 3, fill: "#1f3f7a" }}
                    activeDot={{ r: 5 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="top-assets-panel">
            <p className="muted">
              {th ? "5 อุปกรณ์ที่ได้รับผลกระทบสูงสุด" : "Top 5 Affected Assets"}
            </p>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Host</th>
                    <th>Alert Count</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard.topAffectedAssets.map((item) => (
                    <tr key={item.deviceName}>
                      <td>
                        <span className="asset-name">
                          <HardDrive size={14} /> {item.deviceName}
                        </span>
                      </td>
                      <td>{item.alertCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </article>

      <article className="card full-width">
        <h3 className="section-title">
          <span>
            <Activity size={16} />
          </span>
          {th ? "Realtime Event Stream" : "Realtime Event Stream"}
        </h3>
        <ul className="list stream-log-list">
          {realtimeEventLog.length === 0 ? (
            <li className="muted">
              {th ? "ยังไม่มี event" : "No events yet"}
            </li>
          ) : (
            realtimeEventLog.map((item) => (
              <li key={`${item.at}-${item.eventType}`}>
                <strong>{new Date(item.at).toLocaleTimeString()}</strong>
                <span className="stream-log-type"> {item.eventType}</span>
                {item.reason ? (
                  <span className="muted"> | reason: {item.reason}</span>
                ) : null}
                {item.channels?.length ? (
                  <span className="muted">
                    {" "}
                    | channels: {item.channels.join(", ")}
                  </span>
                ) : null}
              </li>
            ))
          )}
        </ul>
      </article>
    </section>
  );
}

export default DashboardPage;
