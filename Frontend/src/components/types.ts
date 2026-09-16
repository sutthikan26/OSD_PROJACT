import type { AlertItem, DashboardData, HistoryItem } from "../types";

export type ScreenKey =
  | "dashboard"
  | "alerts"
  | "queue"
  | "history"
  | "sla"
  | "inventory"
  | "notifications"
  | "appointmentNotifications"
  | "maintenance"
  | "analytics";

export interface MenuItem {
  key: ScreenKey;
  label: string;
  superOnly?: boolean;
}

export interface RepairModalState {
  open: boolean;
  step: 1 | 2 | 3;
  alert: AlertItem | null;
  rootCauseCategory: string;
  rootCause: string;
  rootCauseCustom: string;
  fixMethod: string;
  kbSuggestions: HistoryItem[];
}

export interface SlaData {
  monthlyTrend: Array<{ month: string; mttr: number; queueMissRate: number }>;
  summary: { avgMttr: number; queueMissRate: number; totalIncidents: number };
  staffEfficiencyRanking: Array<{
    staffName: string;
    resolvedCases: number;
    avgMttr: number;
    accuracyRate: number;
  }>;
  responseTimeTrend: Array<{ label: string; responseSeconds: number }>;
  responseTimeTrendByWindow?: Record<
    "7" | "30" | "90",
    Array<{ label: string; responseSeconds: number }>
  >;
  staffEfficiencyRankingByWindow?: Record<
    "7" | "30" | "90",
    Array<{
      staffName: string;
      resolvedCases: number;
      avgMttr: number;
      accuracyRate: number;
    }>
  >;
  staffDrilldown?: Array<{
    staffName: string;
    totalResolved: number;
    avgMttr: number;
    accuracyRate: number;
    cases: Array<{
      alertId: string;
      deviceName: string;
      mttrMinutes: number;
      queueMissed: boolean;
      closedAt: string;
    }>;
  }>;
  slaCompliance: {
    targetMinutes: number;
    completedCases: number;
    withinTarget: number;
    ratePercent: number;
  };
}

export type StaffQueue = DashboardData["staffStatus"];
