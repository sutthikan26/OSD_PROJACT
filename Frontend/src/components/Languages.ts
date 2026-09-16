import { useCallback, useEffect, useMemo, useState } from "react";
import type { MenuItem } from "./types";

export type Language = "th" | "en";

const LANGUAGE_KEY = "sentinel_noc_intelligence_monitor_language";

const DEFAULT_LANGUAGE: Language = "th";

type MessageKey =
  | "actionFailed"
  | "zabbixFallback"
  | "repairResume"
  | "repairFinished"
  | "repairModalClosed"
  | "alertDeferred"
  | "queueSaved"
  | "userAdded"
  | "userDeleted"
  | "userUpdated"
  | "assetUpdated"
  | "assetAdded"
  | "assetDeleted"
  | "zabbixSaved"
  | "zabbixSavedLocalOnly"
  | "maintenanceCreated"
  | "customerAdded"
  | "maintenanceUpdated"
  | "maintenanceDeleted"
  | "maintenanceAcknowledged"
  | "maintenanceCompleted"
  | "maintenanceDueAlert"
  | "passwordReset"
  | "passwordChanged";

const MESSAGES: Record<MessageKey, { th: string; en: string }> = {
  actionFailed: {
    th: "การดำเนินการล้มเหลว",
    en: "Action failed",
  },
  zabbixFallback: {
    th: "Backend ยังไม่รองรับ /api/zabbix-link ตอนนี้ใช้ค่าในเครื่องชั่วคราว",
    en: "Backend does not support /api/zabbix-link yet. Using local fallback values.",
  },
  repairResume: {
    th: "งานนี้ยังไม่เสร็จสมบูรณ์และปัญหายังไม่ถูกปิด สามารถทำต่อได้ทันที",
    en: "This repair is still in progress and the incident is not closed yet. You can continue now.",
  },
  repairFinished: {
    th: "ปิดงานสำเร็จ",
    en: "Repair closed successfully.",
  },
  repairModalClosed: {
    th: "ปิดหน้าต่างแล้ว: งานยังไม่เสร็จสมบูรณ์และปัญหายังไม่ถูกปิด",
    en: "Modal closed: repair is still in progress and incident is not closed yet.",
  },
  alertDeferred: {
    th: "ส่งงานต่อให้คิวถัดไปเรียบร้อยแล้ว โดยไม่ต้องรอครบ 5 นาที",
    en: "Alert forwarded to the next queue assignee without waiting for the 5-minute timeout.",
  },
  queueSaved: {
    th: "บันทึกลำดับคิวเรียบร้อย",
    en: "Queue order saved successfully.",
  },
  userAdded: {
    th: "เพิ่มผู้ใช้งานสำเร็จ",
    en: "User added successfully.",
  },
  userDeleted: {
    th: "ลบผู้ใช้งานสำเร็จ",
    en: "User deleted successfully.",
  },
  userUpdated: {
    th: "อัปเดตสิทธิ์ผู้ใช้งานสำเร็จ",
    en: "User role updated successfully.",
  },
  assetUpdated: {
    th: "อัปเดต Asset เรียบร้อย",
    en: "Asset updated successfully.",
  },
  assetAdded: {
    th: "เพิ่มอุปกรณ์สำเร็จ",
    en: "Asset added successfully.",
  },
  assetDeleted: {
    th: "ลบอุปกรณ์สำเร็จ",
    en: "Asset deleted successfully.",
  },
  zabbixSaved: {
    th: "บันทึกลิงก์ Zabbix สำเร็จ",
    en: "Zabbix link saved successfully.",
  },
  zabbixSavedLocalOnly: {
    th: "บันทึกเฉพาะในเครื่องสำเร็จ (Backend ยังไม่รองรับ /api/zabbix-link)",
    en: "Saved locally only (Backend does not support /api/zabbix-link yet).",
  },
  maintenanceCreated: {
    th: "เพิ่มตาราง Maintenance สำเร็จ",
    en: "Maintenance plan created successfully.",
  },
  customerAdded: {
    th: "เพิ่มลูกค้าสำเร็จ",
    en: "Customer added successfully.",
  },
  maintenanceUpdated: {
    th: "อัปเดตแผน Maintenance สำเร็จ",
    en: "Maintenance plan updated successfully.",
  },
  maintenanceDeleted: {
    th: "ลบแผน Maintenance สำเร็จ",
    en: "Maintenance plan deleted successfully.",
  },
  maintenanceAcknowledged: {
    th: "ยืนยันรับงาน Maintenance แล้ว",
    en: "Maintenance job acknowledged.",
  },
  maintenanceCompleted: {
    th: "ยืนยันงาน Maintenance เสร็จแล้ว",
    en: "Maintenance job marked as completed.",
  },
  maintenanceDueAlert: {
    th: "ถึงเวลานัดหมาย Maintenance แล้ว กรุณาเปิดหน้า Maintenance เพื่อยืนยันการเข้าดำเนินงาน",
    en: "A maintenance plan is due now. Please open Maintenance page and acknowledge the task.",
  },
  passwordReset: {
    th: "รีเซ็ตรหัสผ่านสำเร็จ ผู้ใช้จะต้องเปลี่ยนรหัสผ่านเมื่อเข้าสู่ระบบครั้งถัดไป",
    en: "Password reset successfully. User will be required to change it on next login.",
  },
  passwordChanged: {
    th: "เปลี่ยนรหัสผ่านสำเร็จ",
    en: "Password changed successfully.",
  },
};

function tr(language: Language, th: string, en: string) {
  return language === "th" ? th : en;
}

function getMessage(language: Language, key: MessageKey) {
  return MESSAGES[key][language];
}

function getInitialLanguage(): Language {
  const saved = localStorage.getItem(LANGUAGE_KEY);
  return saved === "en" ? "en" : DEFAULT_LANGUAGE;
}

export function useLanguageConfig() {
  const [language, setLanguage] = useState<Language>(() =>
    getInitialLanguage(),
  );

  useEffect(() => {
    localStorage.setItem(LANGUAGE_KEY, language);
  }, [language]);

  const menuItems = useMemo(() => getMenuItems(language), [language]);

  const messageByKey = useCallback(
    (key: MessageKey) => getMessage(language, key),
    [language],
  );

  return {
    language,
    setLanguage,
    menuItems,
    messageByKey,
  };
}

function getMenuItems(language: Language): MenuItem[] {
  return [
    { key: "dashboard", label: tr(language, "แดชบอร์ด", "Dashboard") },
    { key: "alerts", label: tr(language, "กระดานแจ้งเตือน", "Alert Board") },
    {
      key: "queue",
      label: tr(language, "ผู้ใช้และคิว", "User & Queue"),
      superOnly: true,
    },
    {
      key: "history",
      label: tr(language, "ประวัติและส่งออก", "History & Export"),
    },
    {
      key: "sla",
      label: tr(language, "SLA บริการ", "Service SLA"),
      superOnly: true,
    },
    { key: "inventory", label: tr(language, "คลังอุปกรณ์", "Inventory") },
    {
      key: "notifications",
      label: tr(language, "ลิงก์ Zabbix", "Zabbix Link"),
      superOnly: true,
    },
    {
      key: "appointmentNotifications",
      label: tr(language, "แจ้งเตือนนัดหมาย", "Appointment Alerts"),
    },
    {
      key: "maintenance",
      label: tr(language, "ปฏิทินบำรุงรักษา", "Maintenance Calendar"),
      superOnly: true,
    },
    {
      key: "analytics",
      label: tr(language, "สถิติและกราฟ", "Analytics"),
    },
  ];
}
