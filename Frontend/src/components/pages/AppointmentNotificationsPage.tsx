import { useEffect, useState } from "react";
import type { MaintenanceItem, Role, User } from "../../types";
import "./AppointmentNotificationsPage.css";

interface AppointmentNotificationsPageProps {
  maintenance: MaintenanceItem[];
  user: User;
  role: Role;
  acknowledgeMaintenance: (id: string) => Promise<void>;
  completeMaintenance: (id: string) => Promise<void>;
  language: "th" | "en";
}

function AppointmentNotificationsPage({
  maintenance,
  user,
  role,
  acknowledgeMaintenance,
  completeMaintenance,
  language,
}: AppointmentNotificationsPageProps) {
  const th = language === "th";
  const isSuperAdmin = role === "admin";
  const locationFallback = th ? "ไม่ระบุ" : "Unspecified";
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 10000);

    return () => window.clearInterval(timer);
  }, []);

  const scopedPlans = maintenance
    .filter((item) => isSuperAdmin || item.assigneeId === user.id)
    .sort((a, b) => Date.parse(a.start) - Date.parse(b.start));

  const dueNow = scopedPlans.filter(
    (item) => item.status === "scheduled" && Date.parse(item.start) <= nowMs,
  );
  const upcoming = scopedPlans.filter((item) => {
    const start = Date.parse(item.start);
    return item.status === "scheduled" && start > nowMs;
  });
  const inProgress = scopedPlans.filter((item) => item.status === "in_progress");
  const totalOpenItems = dueNow.length + inProgress.length + upcoming.length;

  function formatDateTime(value: string) {
    const parsed = Date.parse(value);
    if (!Number.isFinite(parsed)) {
      return "-";
    }
    return new Date(parsed).toLocaleString();
  }

  return (
    <section className="appointment-notify-page">
      <article className="card notify-hero">
        <h3 className="notify-title">
          {th
            ? "แจ้งเตือนนัดหมาย Maintenance"
            : "Maintenance Appointment Alerts"}
        </h3>
        <p className="muted notify-subtitle">
          {th
            ? "แสดงรายการที่ต้องเข้าดำเนินงานตามแผน โดยอ้างอิงผู้รับผิดชอบในระบบ"
            : "Shows maintenance appointments that require action, based on valid system assignees."}
        </p>
        <div className="notify-stats">
          <div className="notify-stat due">
            <span>{th ? "ถึงเวลานัด" : "Due Now"}</span>
            <strong>{dueNow.length}</strong>
          </div>
          <div className="notify-stat progress">
            <span>{th ? "กำลังดำเนินงาน" : "In Progress"}</span>
            <strong>{inProgress.length}</strong>
          </div>
          <div className="notify-stat upcoming">
            <span>{th ? "นัดหมายถัดไป" : "Upcoming"}</span>
            <strong>{upcoming.length}</strong>
          </div>
        </div>
        <p className="notify-summary-line">
          {th
            ? `งานที่ต้องติดตามทั้งหมด ${totalOpenItems} รายการ`
            : `${totalOpenItems} open appointments need attention`}
        </p>
      </article>

      {totalOpenItems === 0 ? (
        <article className="card notify-empty-showcase">
          <div className="notify-empty-badge" aria-hidden="true">
            {"\u25EF"}
          </div>
          <h4>
            {th
              ? "ตอนนี้ไม่มีนัดหมายที่ต้องดำเนินการ"
              : "No appointments require action right now"}
          </h4>
          <p className="muted">
            {th
              ? "เมื่อมีแผน Maintenance ใหม่หรือใกล้ถึงเวลา ระบบจะแสดงรายการที่นี่ทันที"
              : "When a new maintenance plan is created or gets close to its window, it will appear here automatically."}
          </p>
        </article>
      ) : (
        <div className="notify-grid">
          <article className="card notify-card due">
            <h4>
              {th ? "ถึงเวลานัดแล้ว" : "Due Now"}
              <span className="notify-badge">{dueNow.length}</span>
            </h4>
            {dueNow.length === 0 ? (
              <p className="muted notify-empty">
                {th
                  ? "ไม่มีรายการที่ถึงเวลาตอนนี้"
                  : "No due appointments right now."}
              </p>
            ) : (
              <ul className="notify-list">
                {dueNow.map((item) => (
                  <li key={item.id} className="notify-item">
                    <strong>{item.title}</strong>
                    <p className="notify-meta">
                      {th ? "ผู้ปฏิบัติงาน" : "Assignee"}: {item.assigneeName}
                    </p>
                    <p className="notify-meta">
                      {th ? "สถานที่" : "Location"}: {item.location || locationFallback}
                    </p>
                    <p className="notify-meta">
                      {th ? "ช่วงเวลา" : "Window"}: {formatDateTime(item.start)} - {" "}
                      {formatDateTime(item.end)}
                    </p>
                    {item.assigneeId === user.id ? (
                      <button
                        type="button"
                        onClick={() => void acknowledgeMaintenance(item.id)}
                      >
                        {th ? "ตอบรับงาน" : "Acknowledge"}
                      </button>
                    ) : (
                      <span className="muted">
                        {th ? "สำหรับผู้ได้รับมอบหมายเท่านั้น" : "Assigned staff only"}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </article>

          <article className="card notify-card progress">
            <h4>
              {th ? "กำลังดำเนินงาน" : "In Progress"}
              <span className="notify-badge">{inProgress.length}</span>
            </h4>
            {inProgress.length === 0 ? (
              <p className="muted notify-empty">
                {th ? "ไม่มีงานที่ตอบรับแล้ว" : "No acknowledged appointments."}
              </p>
            ) : (
              <ul className="notify-list">
                {inProgress.map((item) => (
                  <li key={item.id} className="notify-item">
                    <strong>{item.title}</strong>
                    <p className="notify-meta">
                      {th ? "ผู้ดำเนินงาน" : "Assignee"}: {item.assigneeName}
                    </p>
                    <p className="notify-meta">
                      {th ? "สถานที่" : "Location"}: {item.location || locationFallback}
                    </p>
                    <p className="notify-meta">
                      {th ? "ตอบรับเมื่อ" : "Acknowledged at"}: {" "}
                      {item.acknowledgedAt
                        ? formatDateTime(item.acknowledgedAt)
                        : "-"}
                    </p>
                    {item.assigneeId === user.id ? (
                      <button
                        type="button"
                        className="secondary"
                        onClick={() => void completeMaintenance(item.id)}
                      >
                        {th ? "ยืนยันเสร็จ" : "Mark Completed"}
                      </button>
                    ) : (
                      <span className="muted">
                        {th ? "สำหรับผู้ได้รับมอบหมายเท่านั้น" : "Assigned staff only"}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </article>

          <article className="card notify-card upcoming">
            <h4>
              {th ? "นัดหมายถัดไป" : "Upcoming"}
              <span className="notify-badge">{upcoming.length}</span>
            </h4>
            {upcoming.length === 0 ? (
              <p className="muted notify-empty">
                {th ? "ไม่มีนัดหมายถัดไป" : "No upcoming appointments."}
              </p>
            ) : (
              <ul className="notify-list">
                {upcoming.slice(0, 8).map((item) => (
                  <li key={item.id} className="notify-item">
                    <strong>{item.title}</strong>
                    <p className="notify-meta">
                      {th ? "ผู้ปฏิบัติงาน" : "Assignee"}: {item.assigneeName}
                    </p>
                    <p className="notify-meta">
                      {th ? "สถานที่" : "Location"}: {item.location || locationFallback}
                    </p>
                    <p className="notify-meta">
                      {th ? "ช่วงเวลา" : "Window"}: {formatDateTime(item.start)} - {" "}
                      {formatDateTime(item.end)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </article>
        </div>
      )}
    </section>
  );
}

export default AppointmentNotificationsPage;
