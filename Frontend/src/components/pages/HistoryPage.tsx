import { useMemo, useState } from "react";
import type { HistoryItem, MaintenanceItem, Role } from "../../types";
import {
  getCategoryLabel,
  getRootCauseLabel,
  getRootCauseParentCategory,
} from "../constants";
import "./HistoryPage.css";

interface HistoryPageProps {
  history: HistoryItem[];
  maintenance: MaintenanceItem[];
  historySearch: string;
  setHistorySearch: (value: string) => void;
  loadHistory: (search: string, month?: number, year?: number) => Promise<void>;
  exportHistory: (role: Role, userId: string, month?: number, year?: number) => Promise<void>;
  role: Role;
  userId: string;
  language: "th" | "en";
  rootCauseCategory?: string;
  onClearCategoryFilter?: () => void;
  historyMonth: number;
  historyYear: number;
  onMonthYearChange: (month: number, year: number) => void;
}

const MONTH_NAMES_TH = ["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];
const MONTH_NAMES_EN = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function escapeCsvValue(value: unknown) {
  const normalized = String(value ?? "").replace(/"/g, '""');
  return `"${normalized}"`;
}

function HistoryPage({
  history,
  maintenance,
  historySearch,
  setHistorySearch,
  loadHistory,
  exportHistory,
  role,
  userId,
  language,
  rootCauseCategory,
  onClearCategoryFilter,
  historyMonth,
  historyYear,
  onMonthYearChange,
}: HistoryPageProps) {
  const th = language === "th";

  // ── Repair history month nav ──────────────────────────────────
  function prevMonth() {
    if (historyMonth === 1) onMonthYearChange(12, historyYear - 1);
    else onMonthYearChange(historyMonth - 1, historyYear);
  }

  function nextMonth() {
    const now = new Date();
    if (historyYear > now.getFullYear() || (historyYear === now.getFullYear() && historyMonth >= now.getMonth() + 1)) return;
    if (historyMonth === 12) onMonthYearChange(1, historyYear + 1);
    else onMonthYearChange(historyMonth + 1, historyYear);
  }

  const isCurrentMonth = (() => {
    const now = new Date();
    return historyMonth === now.getMonth() + 1 && historyYear === now.getFullYear();
  })();

  const monthLabel = th
    ? `${MONTH_NAMES_TH[historyMonth - 1]} ${historyYear + 543}`
    : `${MONTH_NAMES_EN[historyMonth - 1]} ${historyYear}`;

  // ── Appointment month nav ─────────────────────────────────────
  const [apptMonth, setApptMonth] = useState(() => new Date().getMonth() + 1);
  const [apptYear, setApptYear] = useState(() => new Date().getFullYear());

  const apptMonthLabel = th
    ? `${MONTH_NAMES_TH[apptMonth - 1]} ${apptYear + 543}`
    : `${MONTH_NAMES_EN[apptMonth - 1]} ${apptYear}`;

  const isApptCurrentMonth = (() => {
    const now = new Date();
    return apptMonth === now.getMonth() + 1 && apptYear === now.getFullYear();
  })();

  function prevApptMonth() {
    if (apptMonth === 1) { setApptMonth(12); setApptYear((y) => y - 1); }
    else setApptMonth((m) => m - 1);
  }

  function nextApptMonth() {
    if (isApptCurrentMonth) return;
    if (apptMonth === 12) { setApptMonth(1); setApptYear((y) => y + 1); }
    else setApptMonth((m) => m + 1);
  }

  // ── Repair history filter ─────────────────────────────────────
  const filteredHistory = useMemo(() => {
    if (!rootCauseCategory) return history;
    return history.filter(
      (item) => getRootCauseParentCategory(item.rootCause) === rootCauseCategory,
    );
  }, [history, rootCauseCategory]);

  // ── Appointment history filter ────────────────────────────────
  const locationFallback = th ? "ไม่ระบุ" : "Unspecified";
  const [appointmentSearch, setAppointmentSearch] = useState("");
  const [appointmentSearchText, setAppointmentSearchText] = useState("");

  const maintenanceHistory = maintenance
    .filter((item) => item.status === "completed")
    .filter((item) => role === "admin" || item.assigneeId === userId)
    .sort((a, b) => {
      const left = Date.parse(a.completedAt || a.end);
      const right = Date.parse(b.completedAt || b.end);
      return right - left;
    });

  const filteredMaintenanceHistory = useMemo(() => {
    const keyword = appointmentSearchText.trim().toLowerCase();

    return maintenanceHistory.filter((item) => {
      const dateStr = item.completedAt || item.end;
      if (dateStr) {
        const d = new Date(dateStr);
        if (d.getMonth() + 1 !== apptMonth || d.getFullYear() !== apptYear) {
          return false;
        }
      }
      if (!keyword) return true;
      const location = (item.location || "").toLowerCase();
      const completedBy = (item.completedByName || item.completedBy || "").toLowerCase();
      return (
        item.title.toLowerCase().includes(keyword) ||
        location.includes(keyword) ||
        item.assigneeName.toLowerCase().includes(keyword) ||
        completedBy.includes(keyword)
      );
    });
  }, [appointmentSearchText, maintenanceHistory, apptMonth, apptYear]);

  function onSearchAppointmentHistory() {
    setAppointmentSearchText(appointmentSearch);
  }

  function exportAppointmentHistory() {
    const rows = filteredMaintenanceHistory;
    const csv = [
      "title,location,assignee,windowStart,windowEnd,completedBy,completedAt",
      ...rows.map((item) => {
        const completedBy = item.completedByName || item.completedBy || "";
        const completedAt = item.completedAt || "";
        return [
          item.title,
          item.location || locationFallback,
          item.assigneeName,
          item.start,
          item.end,
          completedBy,
          completedAt,
        ]
          .map(escapeCsvValue)
          .join(",");
      }),
    ].join("\r\n");

    const blob = new Blob(["﻿", csv], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    const label = `${MONTH_NAMES_EN[apptMonth - 1]}-${apptYear}`;
    anchor.download = `appointment-history-${label}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(url);
  }

  return (
    <section className="history-page-blocks">
      {/* ── Repair History ── */}
      <article className="card history-page">
        <div className="history-header-row">
          <h3>{th ? "ประวัติการซ่อม (Repair)" : "Repair History"}</h3>
          <div className="month-nav">
            <button className="month-nav-btn" onClick={prevMonth} title={th ? "เดือนก่อนหน้า" : "Previous month"}>&#8249;</button>
            <span className="month-nav-label">{monthLabel}</span>
            <button className="month-nav-btn" onClick={nextMonth} disabled={isCurrentMonth} title={th ? "เดือนถัดไป" : "Next month"}>&#8250;</button>
          </div>
        </div>
        <div className="toolbar">
          <input
            value={historySearch}
            onChange={(event) => setHistorySearch(event.target.value)}
            placeholder={th ? "ค้นหาด้วยชื่ออุปกรณ์หรือพนักงาน" : "Search by device or staff name"}
          />
          <button onClick={() => void loadHistory(historySearch)}>
            {th ? "ค้นหา" : "Search"}
          </button>
          <button onClick={() => void exportHistory(role, userId, historyMonth, historyYear)}>
            {th ? `ส่งออก CSV (${monthLabel})` : `Export CSV (${monthLabel})`}
          </button>
          {rootCauseCategory && (
            <span className="category-filter-badge">
              {th ? "หมวดหมู่" : "Category"}:{" "}
              <strong>{getCategoryLabel(rootCauseCategory, th ? "th" : "en")}</strong>
              <button className="category-filter-clear" onClick={onClearCategoryFilter} title={th ? "ล้างตัวกรอง" : "Clear filter"}>
                &times;
              </button>
            </span>
          )}
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{th ? "อุปกรณ์" : "Device"}</th>
                <th>{th ? "พนักงาน" : "Staff"}</th>
                <th>{th ? "สาเหตุหลัก" : "Root Cause"}</th>
                <th>{th ? "วิธีแก้ไข" : "Fix Method"}</th>
                <th>MTTR</th>
                <th>{th ? "เวลาปิดงาน" : "Closed"}</th>
              </tr>
            </thead>
            <tbody>
              {filteredHistory.length === 0 && (
                <tr>
                  <td colSpan={6} className="empty-cell">
                    {th ? "ไม่พบข้อมูลประวัติที่ตรงกับเงื่อนไข" : "No history records match your search."}
                  </td>
                </tr>
              )}
              {filteredHistory.map((item) => (
                <tr key={item.id}>
                  <td>{item.deviceName}</td>
                  <td>{item.staffName}</td>
                  <td>{getRootCauseLabel(item.rootCause, th ? "th" : "en")}</td>
                  <td>{item.fixMethod || "-"}</td>
                  <td>{item.mttrMinutes} {th ? "นาที" : "min"}</td>
                  <td>{new Date(item.closedAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>

      {/* ── Appointment History ── */}
      <article className="card history-page appointment-history-block">
        <div className="history-header-row">
          <h3>
            {role === "admin"
              ? th ? "ประวัตินัดหมาย (ทุกคน)" : "Appointment History (All Staff)"
              : th ? "ประวัตินัดหมายของฉัน" : "My Appointment History"}
          </h3>
          <div className="month-nav">
            <button className="month-nav-btn" onClick={prevApptMonth} title={th ? "เดือนก่อนหน้า" : "Previous month"}>&#8249;</button>
            <span className="month-nav-label">{apptMonthLabel}</span>
            <button className="month-nav-btn" onClick={nextApptMonth} disabled={isApptCurrentMonth} title={th ? "เดือนถัดไป" : "Next month"}>&#8250;</button>
          </div>
        </div>
        <div className="appointment-toolbar">
          <input
            value={appointmentSearch}
            onChange={(event) => setAppointmentSearch(event.target.value)}
            placeholder={th ? "ค้นหาด้วยหัวข้อ/สถานที่/ผู้ปฏิบัติงาน/ผู้ยืนยัน" : "Search by title/location/assignee/completed by"}
          />
          <button onClick={onSearchAppointmentHistory}>
            {th ? "ค้นหา" : "Search"}
          </button>
          <button onClick={exportAppointmentHistory}>
            {th ? `ส่งออก CSV (${apptMonthLabel})` : `Export CSV (${apptMonthLabel})`}
          </button>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{th ? "หัวข้อ" : "Title"}</th>
                <th>{th ? "สถานที่" : "Location"}</th>
                <th>{th ? "ผู้ปฏิบัติงาน" : "Assignee"}</th>
                <th>{th ? "ช่วงเวลา" : "Window"}</th>
                <th>{th ? "ผู้ยืนยันเสร็จ" : "Completed By"}</th>
                <th>{th ? "เวลายืนยันเสร็จ" : "Completed At"}</th>
              </tr>
            </thead>
            <tbody>
              {filteredMaintenanceHistory.length === 0 && (
                <tr>
                  <td colSpan={6} className="empty-cell">
                    {th ? "ไม่พบข้อมูลประวัตินัดหมายที่ตรงกับเงื่อนไข" : "No appointment history records match your search."}
                  </td>
                </tr>
              )}
              {filteredMaintenanceHistory.map((item) => (
                <tr key={item.id}>
                  <td>{item.title}</td>
                  <td>{item.location || locationFallback}</td>
                  <td>{item.assigneeName}</td>
                  <td>
                    <div className="appointment-window-cell">
                      <div>{new Date(item.start).toLocaleString()}</div>
                      <div>{new Date(item.end).toLocaleString()}</div>
                    </div>
                  </td>
                  <td>{item.completedByName || item.completedBy || "-"}</td>
                  <td>{item.completedAt ? new Date(item.completedAt).toLocaleString() : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
}

export default HistoryPage;
