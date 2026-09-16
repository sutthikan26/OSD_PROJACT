import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { DashboardData } from "../../types";

interface AnalyticsPageProps {
  dashboard: DashboardData | null;
  language: "th" | "en";
}

const th = (language: "th" | "en", t: string, e: string) =>
  language === "th" ? t : e;

export default function AnalyticsPage({ dashboard, language }: AnalyticsPageProps) {
  const mttrData = dashboard?.mttrTrendDaily?.slice(-14) ?? [];

  return (
    <div style={{ padding: "24px", maxWidth: "900px" }}>
      <h2
        style={{
          color: "#2b2c2d",
          fontSize: "20px",
          fontWeight: 700,
          margin: "0 0 4px",
        }}
      >
        {th(language, "สถิติและกราฟ", "Analytics")}
      </h2>
      <p style={{ color: "#2f3133", fontSize: "13px", margin: "0 0 24px" }}>
        {th(language, "แนวโน้มเวลาการแก้ไขปัญหาเฉลี่ยรายวัน", "Daily average incident resolution time trend")}
      </p>

      <div
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "12px",
          padding: "20px 24px",
        }}
      >
        <h3
          style={{
            color: "#6a6d72",
            fontSize: "15px",
            fontWeight: 600,
            margin: "0 0 16px",
            paddingBottom: "8px",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          {th(language, "แนวโน้ม MTTR รายวัน (นาที)", "Daily MTTR Trend (minutes)")}
        </h3>

        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={mttrData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" />
            <XAxis
              dataKey="day"
              tick={{ fill: "#7a96b8", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fill: "#7a96b8", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                background: "#1a2a3a",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "8px",
                color: "#c8d8f0",
                fontSize: "12px",
              }}
            />
            <Legend wrapperStyle={{ fontSize: "12px", color: "#7a96b8" }} />
            <Line
              type="monotone"
              dataKey="mttrMinutes"
              name={th(language, "MTTR (นาที)", "MTTR (min)")}
              stroke="#4f8ef7"
              strokeWidth={2}
              dot={{ r: 3, fill: "#4f8ef7" }}
              activeDot={{ r: 5 }}
            />
            <Line
              type="monotone"
              dataKey="incidentCount"
              name={th(language, "จำนวน Incident", "Incident Count")}
              stroke="#34c98d"
              strokeWidth={2}
              dot={{ r: 3, fill: "#34c98d" }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
