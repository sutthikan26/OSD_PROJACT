export type Role = "user" | "admin";

export interface User {
  id: string;
  name: string;
  username: string;
  role: Role;
  mustChangePassword?: boolean;
}

export interface ManagedUser {
  id: string;
  name: string;
  username: string;
  role: Role;
  mustChangePassword?: boolean;
}

export interface DashboardData {
  healthStatusPercent: number;
  availabilityGauge: {
    percent: number;
    healthyHosts: number;
    totalHosts: number;
  };
  alertSeverityBreakdown: {
    critical: number;
    high: number;
    warning: number;
    info: number;
  };
  staffStatus: Array<{
    id: string;
    name: string;
    role: string;
    isActive: boolean;
    status: "Available" | "Busy" | "Offline";
    currentDevice: string | null;
    currentTicketId: string | null;
    lastResponseSeconds: number;
    queueOrder?: number;
  }>;
  incidentAnalysis: Array<{ cause: string; count: number }>;
  rcaChart: Array<{ cause: string; count: number }>;
  mttrTrendDaily: Array<{ day: string; mttrMinutes: number; incidentCount: number }>;
  topAffectedAssets: Array<{ deviceName: string; alertCount: number }>;
}

export interface AlertItem {
  id: string;
  deviceName: string;
  problemName?: string | null;
  severity: string;
  status: string;
  assignedTo: string | null;
  assignedName?: string | null;
  queuePosition: number | null;
  createdAt: number;
  responseStartedAt: string | null;
  diagnosis: string;
  fixMethod: string;
  closedAt: string | null;
}

export interface HistoryItem {
  id: string;
  alertId: string;
  deviceName: string;
  staffId: string;
  staffName: string;
  rootCause: string;
  fixMethod: string;
  mttrMinutes: number;
  queueMissed: boolean;
  closedAt: string;
}

export interface InventoryItem {
  id: string;
  deviceName: string;
  serialNumber: string;
  ipAddress: string;
  warrantyUntil: string;
  location: string;
}

export interface MaintenanceItem {
  id: string;
  customerName: string;
  title: string;
  location: string;
  start: string;
  end: string;
  pauseZabbixAlert: boolean;
  createdBy: string;
  assigneeId: string;
  assigneeName: string;
  status: "scheduled" | "in_progress" | "completed";
  acknowledgedBy: string | null;
  acknowledgedAt: string | null;
  acknowledgedByName?: string | null;
  completedBy: string | null;
  completedAt: string | null;
  completedByName?: string | null;
}

export interface CustomerItem {
  id: string;
  name: string;
  location: string;
}
