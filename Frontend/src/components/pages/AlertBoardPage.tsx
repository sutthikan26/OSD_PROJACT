import type { AlertItem } from "../../types";
import { AlarmClock, Hand } from "lucide-react";
import "./AlertBoardPage.css";

interface AlertBoardPageProps {
  alerts: {
    escalationQueue: AlertItem[];
    claimPool: AlertItem[];
    inProgress: AlertItem[];
  };
  now: number;
  userId: string;
  onAcceptAlert: (alert: AlertItem, mode: "queue" | "claim") => Promise<void>;
  onDeferAlert: (alert: AlertItem) => Promise<void>;
  onResumeRepair: (alert: AlertItem) => void;
  language: "th" | "en";
}

function severityClass(severity: string) {
  if (severity === "Critical") return "critical";
  if (severity === "High") return "high";
  if (severity === "Medium") return "medium";
  return "low";
}

function AlertBoardPage({
  alerts,
  now,
  userId,
  onAcceptAlert,
  onDeferAlert,
  onResumeRepair,
  language,
}: AlertBoardPageProps) {
  const th = language === "th";
  const inProgress = alerts.inProgress ?? [];
  const claimPool = alerts.claimPool ?? [];
  const escalationQueue = alerts.escalationQueue ?? [];
  const hasMyInProgress = inProgress.some(
    (item) => item.assignedTo === userId,
  );
  const claimCandidates = [
    ...claimPool,
    ...escalationQueue.filter(
      (item) => !!item.assignedTo && item.assignedTo !== userId,
    ),
  ].filter(
    (item, index, arr) => arr.findIndex((x) => x.id === item.id) === index,
  );

  return (
    <section className="grid-2 alert-board-page">
      <article className="card">
        <h3 className="section-title">
          <span>
            <AlarmClock size={16} />
          </span>
          {th ? "คิว Escalation (5 นาที)" : "Escalation Queue (5 min)"}
        </h3>
        {hasMyInProgress && (
          <p className="accept-lock-note">
            {th
              ? "คุณมีงานที่กำลังดำเนินการอยู่แล้ว จึงยังรับงานใหม่ไม่ได้"
              : "You already have an active repair, so you cannot accept a new one yet."}
          </p>
        )}
        <div className="table-wrap">
          <table className="escalation-table">
            <thead>
              <tr>
                <th>{th ? "อุปกรณ์" : "Device"}</th>
                <th>{th ? "ปัญหา" : "Problem"}</th>
                <th>{th ? "ผลกระทบ" : "Impact"}</th>
                <th>{th ? "เวลาที่เหลือ" : "Time Left"}</th>
                <th>{th ? "การจัดการ" : "Action"}</th>
              </tr>
            </thead>
            <tbody>
              {alerts.escalationQueue.length === 0 && (
                <tr>
                  <td colSpan={5} className="empty-cell">
                    {th
                      ? "ไม่มีงานในคิว Escalation"
                      : "No incidents in Escalation Queue"}
                  </td>
                </tr>
              )}
              {alerts.escalationQueue.map((alert) => {
                const rawCreatedAt = String(alert.createdAt);
                // Ensure UTC parsing: append Z if no timezone info present
                const utcStr =
                  typeof alert.createdAt === "number"
                    ? alert.createdAt
                    : /Z$|[+-]\d{2}:\d{2}$/.test(rawCreatedAt)
                      ? rawCreatedAt
                      : rawCreatedAt.replace(" ", "T") + "Z";
                const createdAtMs =
                  typeof utcStr === "number" ? utcStr : Date.parse(utcStr);
                const remain = Math.max(
                  0,
                  300 - Math.floor((now - createdAtMs) / 1000),
                );
                const timeText = `${Math.floor(remain / 60)}:${String(remain % 60).padStart(2, "0")}`;
                const reservedForOther =
                  !!alert.assignedTo && alert.assignedTo !== userId;
                return (
                  <tr key={alert.id}>
                    <td>{alert.deviceName}</td>
                    <td className="problem-cell">{alert.problemName || "-"}</td>
                    <td>
                      <span
                        className={`severity-chip ${severityClass(alert.severity)}`}
                      >
                        {alert.severity}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`countdown ${remain <= 60 ? "urgent" : ""}`}
                      >
                        {timeText}
                      </span>
                    </td>
                    <td>
                      <div className="alert-action-group">
                        {reservedForOther && (
                          <p className="accept-lock-note" style={{ margin: "0 0 4px", textAlign: "center", fontSize: "11px" }}>
                            {th
                              ? `คิวของ ${alert.assignedName || alert.assignedTo}`
                              : `Reserved for ${alert.assignedName || alert.assignedTo}`}
                          </p>
                        )}
                        <button
                          onClick={() => void onAcceptAlert(alert, "queue")}
                          disabled={hasMyInProgress || reservedForOther}
                        >
                          {th ? "ยอมรับ" : "Accept"}
                        </button>
                        <button
                          type="button"
                          className="secondary-action"
                          onClick={() => void onDeferAlert(alert)}
                          disabled={reservedForOther}
                          title={
                            reservedForOther
                              ? th
                                ? "งานนี้เป็นคิวของผู้ใช้อื่น"
                                : "This alert is reserved for another staff member"
                              : undefined
                          }
                        >
                          {th ? "ปฏิเสธ" : "Reject"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </article>

      <article className="card">
        <h3 className="section-title">
          <span>
            <Hand size={16} />
          </span>
          {th ? "คิว Claim" : "Claim Pool"}
        </h3>
        {hasMyInProgress && (
          <p className="accept-lock-note">
            {th
              ? "ปิดงานเดิมให้เสร็จก่อน แล้วจึงรับงานจาก Claim Pool ได้"
              : "Complete your current repair before accepting an incident from Claim Pool."}
          </p>
        )}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{th ? "อุปกรณ์" : "Device"}</th>
                <th>{th ? "ผลกระทบ" : "Impact"}</th>
                <th>{th ? "การจัดการ" : "Action"}</th>
              </tr>
            </thead>
            <tbody>
              {claimCandidates.length === 0 && (
                <tr>
                  <td colSpan={3} className="empty-cell">
                    {th
                      ? "ไม่มีงานใน Claim Pool"
                      : "No incidents in Claim Pool"}
                  </td>
                </tr>
              )}
              {claimCandidates.map((alert) => (
                <tr key={alert.id}>
                  <td>{alert.deviceName}</td>
                  <td>
                    <span
                      className={`severity-chip ${severityClass(alert.severity)}`}
                    >
                      {alert.severity}
                    </span>
                  </td>
                  <td>
                    <button
                      onClick={() => void onAcceptAlert(alert, "claim")}
                      disabled={hasMyInProgress}
                    >
                      {th ? "รับงาน" : "Accept"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>

      <article className="card in-progress-card">
        <h3 className="section-title">
          <span>
            <Hand size={16} />
          </span>
          {th ? "กำลังดำเนินการ (ยังไม่เสร็จ)" : "In Progress (Open)"}
        </h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{th ? "อุปกรณ์" : "Device"}</th>
                <th>{th ? "ผู้รับงาน" : "Assignee"}</th>
                <th>{th ? "สถานะ" : "Status"}</th>
                <th>{th ? "การจัดการ" : "Action"}</th>
              </tr>
            </thead>
            <tbody>
              {inProgress.length === 0 && (
                <tr>
                  <td colSpan={4} className="empty-cell">
                    {th ? "ไม่มีงานที่กำลังซ่อม" : "No active repairs"}
                  </td>
                </tr>
              )}
              {inProgress.map((alert) => {
                const ownedByMe = alert.assignedTo === userId;
                return (
                  <tr key={alert.id}>
                    <td>{alert.deviceName}</td>
                    <td>{alert.assignedName || alert.assignedTo || "-"}</td>
                    <td>
                      <span
                        className={`progress-badge ${ownedByMe ? "mine" : "locked"}`}
                      >
                        {ownedByMe
                          ? th
                            ? "กำลังแก้ไข (ของฉัน)"
                            : "In Progress (Mine)"
                          : th
                            ? "มีผู้รับงานแล้ว"
                            : "Already Assigned"}
                      </span>
                    </td>
                    <td>
                      {ownedByMe ? (
                        <button onClick={() => onResumeRepair(alert)}>
                          {th ? "ทำงานต่อ" : "Continue"}
                        </button>
                      ) : (
                        <button disabled>
                          {th ? "รับงานไม่ได้" : "Unavailable"}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
}

export default AlertBoardPage;
