import { useEffect, useRef, useState } from "react";
import type { AlertItem } from "../types";
import "./AlertQueueToast.css";

interface AlertQueueToastProps {
  myPendingAlerts: AlertItem[];
  now: number;
  language: "th" | "en";
  onAccept: (alert: AlertItem) => void;
  onDefer: (alert: AlertItem) => void;
  onDismiss: (alertId: string) => void;
}

function AlertQueueToast({
  myPendingAlerts,
  now,
  language,
  onAccept,
  onDefer,
  onDismiss,
}: AlertQueueToastProps) {
  const th = language === "th";
  const [visible, setVisible] = useState(false);
  const prevIdsRef = useRef<Set<string>>(new Set());
  const [shaking, setShaking] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    const AudioCtx =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) {
      return;
    }

    const unlockAudio = async () => {
      try {
        if (!audioContextRef.current) {
          audioContextRef.current = new AudioCtx();
        }
        if (audioContextRef.current.state === "suspended") {
          await audioContextRef.current.resume();
        }
      } catch {
        // Ignore unlock failures (browser policy may require direct user gesture).
      }
    };

    window.addEventListener("pointerdown", unlockAudio);
    window.addEventListener("keydown", unlockAudio);

    return () => {
      window.removeEventListener("pointerdown", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
      if (audioContextRef.current) {
        void audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, []);

  function playTone(audioContext: AudioContext) {
    const nowTime = audioContext.currentTime;
    const notes = [880, 1174];

    notes.forEach((frequency, index) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.type = "sine";
      oscillator.frequency.value = frequency;

      const startAt = nowTime + index * 0.12;
      const endAt = startAt + 0.1;

      gainNode.gain.setValueAtTime(0.0001, startAt);
      gainNode.gain.exponentialRampToValueAtTime(0.14, startAt + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, endAt);

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.start(startAt);
      oscillator.stop(endAt);
    });
  }

  function playNotificationSound() {
    const AudioCtx =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) {
      return;
    }

    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioCtx();
      }
      const audioContext = audioContextRef.current;
      if (audioContext.state === "running") {
        playTone(audioContext);
        return;
      }

      void audioContext.resume().then(() => {
        if (audioContext.state === "running") {
          playTone(audioContext);
        }
      });
    } catch {
      // Ignore audio playback failures (e.g. browser autoplay policy).
    }
  }

  useEffect(() => {
    if (myPendingAlerts.length > 0) {
      const anyNew = myPendingAlerts.some(
        (a) => !prevIdsRef.current.has(a.id),
      );
      if (anyNew) {
        setShaking(true);
        playNotificationSound();
        setTimeout(() => setShaking(false), 600);
      }
      setVisible(true);
      prevIdsRef.current = new Set(myPendingAlerts.map((a) => a.id));
    } else {
      setVisible(false);
      prevIdsRef.current.clear();
    }
  }, [myPendingAlerts]);

  if (!visible || myPendingAlerts.length === 0) return null;

  function getTimeLeft(alert: AlertItem) {
    const rawCreatedAt = String(alert.createdAt);
    const utcStr = /Z$|[+-]\d{2}:\d{2}$/.test(rawCreatedAt)
      ? rawCreatedAt
      : rawCreatedAt.replace(" ", "T") + "Z";
    const createdAtMs =
      typeof alert.createdAt === "number" ? alert.createdAt : Date.parse(utcStr);
    const remain = Math.max(0, 300 - Math.floor((now - createdAtMs) / 1000));
    return `${Math.floor(remain / 60)}:${String(remain % 60).padStart(2, "0")}`;
  }

  function severityLabel(severity: string) {
    if (severity === "Critical") return "🔴";
    if (severity === "High") return "🟠";
    if (severity === "Medium") return "🟡";
    return "🟢";
  }

  return (
    <div className={`aqt-container ${shaking ? "aqt-shake" : ""}`}>
      <div className="aqt-header">
        <span className="aqt-bell">🔔</span>
        <strong>
          {th ? "ถึงคิวรับงานของคุณ!" : "Your turn to accept!"}
        </strong>
        <span className="aqt-count">{myPendingAlerts.length}</span>
      </div>
      <ul className="aqt-list">
        {myPendingAlerts.map((alert) => (
          <li key={alert.id} className="aqt-item">
            <div className="aqt-item-info">
              <span className="aqt-severity">{severityLabel(alert.severity)}</span>
              <div>
                <span className="aqt-device">{alert.deviceName}</span>
                <span className="aqt-timer">
                  {th ? "เหลือ" : "Left"}: {getTimeLeft(alert)}
                </span>
              </div>
            </div>
            <div className="aqt-actions">
              <button
                className="aqt-accept"
                onClick={() => onAccept(alert)}
                type="button"
              >
                {th ? "รับงาน" : "Accept"}
              </button>
              <button
                className="aqt-defer"
                onClick={() => onDefer(alert)}
                type="button"
              >
                {th ? "ไม่ว่าง" : "Not Available"}
              </button>
              <button
                className="aqt-dismiss"
                onClick={() => onDismiss(alert.id)}
                type="button"
                title={th ? "ปิดแจ้งเตือนนี้ชั่วคราว" : "Dismiss temporarily"}
              >
                {th ? "ปิด" : "Dismiss"}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default AlertQueueToast;
