import { useEffect, useRef, useState } from "react";
import type { MaintenanceItem } from "../types";
import "./MaintenanceDueToast.css";

interface MaintenanceDueToastProps {
  duePlans: MaintenanceItem[];
  now: number;
  language: "th" | "en";
  onOpen: (id: string) => void;
  onDismiss: (id: string) => void;
}

function MaintenanceDueToast({
  duePlans,
  now,
  language,
  onOpen,
  onDismiss,
}: MaintenanceDueToastProps) {
  const th = language === "th";
  const [visible, setVisible] = useState(false);
  const [shaking, setShaking] = useState(false);
  const [displayNow, setDisplayNow] = useState(now);
  const prevIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (duePlans.length > 0) {
      const hasNew = duePlans.some((item) => !prevIdsRef.current.has(item.id));
      if (hasNew) {
        setShaking(true);
        window.setTimeout(() => setShaking(false), 600);
      }
      setVisible(true);
      prevIdsRef.current = new Set(duePlans.map((item) => item.id));
      return;
    }

    setVisible(false);
    prevIdsRef.current.clear();
  }, [duePlans]);

  useEffect(() => {
    setDisplayNow(now);
  }, [now]);

  if (!visible || duePlans.length === 0) {
    return null;
  }

  function getDelay(plan: MaintenanceItem) {
    const startMs = Date.parse(plan.start);
    if (!Number.isFinite(startMs)) {
      return th ? "ถึงเวลาแล้ว" : "Due now";
    }

    const elapsedSeconds = Math.max(0, Math.floor((displayNow - startMs) / 1000));
    const hours = Math.floor(elapsedSeconds / 3600);
    const minutes = Math.floor((elapsedSeconds % 3600) / 60);

    if (hours > 0) {
      return th
        ? `เลยเวลา ${hours} ชม. ${minutes} นาที`
        : `${hours}h ${minutes}m overdue`;
    }
    return th ? `เลยเวลา ${minutes} นาที` : `${minutes}m overdue`;
  }

  return (
    <div className={`mdt-container ${shaking ? "mdt-shake" : ""}`}>
      <div className="mdt-header">
        <span className="mdt-bell">📅</span>
        <strong>{th ? "ถึงเวลานัดหมาย Maintenance" : "Maintenance due now"}</strong>
        <span className="mdt-count">{duePlans.length}</span>
      </div>
      <ul className="mdt-list">
        {duePlans.slice(0, 5).map((plan) => (
          <li key={plan.id} className="mdt-item">
            <div className="mdt-item-info">
              <span className="mdt-title">{plan.title}</span>
              <span className="mdt-meta">
                {th ? "ผู้รับผิดชอบ" : "Assignee"}: {plan.assigneeName}
              </span>
              <span className="mdt-delay">{getDelay(plan)}</span>
            </div>
            <div className="mdt-actions">
              <button
                className="mdt-open"
                onClick={() => onOpen(plan.id)}
                type="button"
              >
                {th ? "ดูนัดหมาย" : "Open"}
              </button>
              <button
                className="mdt-dismiss"
                onClick={() => onDismiss(plan.id)}
                type="button"
                title={th ? "ปิดแจ้งเตือนนี้" : "Dismiss this reminder"}
              >
                ✕
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default MaintenanceDueToast;
