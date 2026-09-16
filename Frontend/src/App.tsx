import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import {
  apiRequest,
  createEventStream,
  downloadHistoryExport,
} from "./api";
import type { RealtimeInvalidateEvent } from "./api";
import type {
  AlertItem,
  DashboardData,
  CustomerItem,
  HistoryItem,
  InventoryItem,
  ManagedUser,
  MaintenanceItem,
  Role,
  User,
} from "./types";
import LoginPage from "./components/pages/LoginPage";
import DashboardPage from "./components/pages/DashboardPage";
import AlertBoardPage from "./components/pages/AlertBoardPage";
import QueueManagementPage from "./components/pages/QueueManagementPage";
import HistoryPage from "./components/pages/HistoryPage";
import SlaPage from "./components/pages/SlaPage";
import InventoryPage from "./components/pages/InventoryPage";
import NotificationSettingsPage from "./components/pages/NotificationSettingsPage";
import MaintenancePage from "./components/pages/MaintenancePage";
import AppointmentNotificationsPage from "./components/pages/AppointmentNotificationsPage";
import RepairModal from "./components/pages/RepairModal";
import AnalyticsPage from "./components/pages/AnalyticsPage";
import AlertQueueToast from "./components/AlertQueueToast";
import MaintenanceDueToast from "./components/MaintenanceDueToast";
import Sidebar from "./components/layout/Sidebar";
import TopBar from "./components/layout/TopBar";
import type {
  RepairModalState,
  ScreenKey,
  SlaData,
  StaffQueue,
} from "./components/types";
import { useLanguageConfig } from "./components/Languages";

const STORAGE_KEY = "sentinel_noc_intelligence_monitor_session_v2";
const ZABBIX_LINK_STORAGE_KEY = "sentinel_noc_intelligence_monitor_zabbix_link";
const SIDEBAR_COLLAPSED_KEY =
  "sentinel_noc_intelligence_monitor_sidebar_collapsed";

function App() {
  const [dashboardLastUpdatedAt, setDashboardLastUpdatedAt] = useState<
    number | null
  >(null);
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const [realtimeEventLog, setRealtimeEventLog] = useState<
    Array<{
      at: number;
      eventType: string;
      reason?: string;
      channels?: string[];
    }>
  >([]);
  const [user, setUser] = useState<User | null>(() => {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  });
  const [activeScreen, setActiveScreen] = useState<ScreenKey>("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    const saved = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    return saved === "1";
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [alerts, setAlerts] = useState<{
    escalationQueue: AlertItem[];
    claimPool: AlertItem[];
    inProgress: AlertItem[];
  }>({
    escalationQueue: [],
    claimPool: [],
    inProgress: [],
  });
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historySearch, setHistorySearch] = useState("");
  const [historyRootCauseCategory, setHistoryRootCauseCategory] = useState("");
  const [historyMonth, setHistoryMonth] = useState(() => new Date().getMonth() + 1);
  const [historyYear, setHistoryYear] = useState(() => new Date().getFullYear());
  const [queue, setQueue] = useState<StaffQueue>([]);
  const [systemUsers, setSystemUsers] = useState<ManagedUser[]>([]);
  const [sla, setSla] = useState<SlaData | null>(null);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [editInventory, setEditInventory] = useState<
    Record<string, InventoryItem>
  >({});
  const [zabbixSettings, setZabbixSettings] = useState<{
    baseUrl: string;
    apiUrl: string;
    apiToken: string;
  }>(() => ({
    baseUrl: localStorage.getItem(ZABBIX_LINK_STORAGE_KEY) || "",
    apiUrl: "",
    apiToken: "",
  }));
  const [maintenance, setMaintenance] = useState<MaintenanceItem[]>([]);
  const [customers, setCustomers] = useState<CustomerItem[]>([]);
  const [newMaintenance, setNewMaintenance] = useState({
    customerName: "",
    title: "",
    location: "",
    start: "",
    end: "",
    pauseZabbixAlert: true,
    assigneeId: "",
  });
  const [editingMaintenanceId, setEditingMaintenanceId] = useState<
    string | null
  >(null);
  const [now, setNow] = useState(Date.now());
  const activeScreenRef = useRef<ScreenKey>(activeScreen);
  const historySearchRef = useRef(historySearch);
  const historyMonthRef = useRef(historyMonth);
  const historyYearRef = useRef(historyYear);
  const realtimeRefreshTimers = useRef<Record<string, number>>({});

  const [forceChangeNew, setForceChangeNew] = useState("");
  const [forceChangeConfirm, setForceChangeConfirm] = useState("");
  const [forceChangeError, setForceChangeError] = useState("");

  const [repairModal, setRepairModal] = useState<RepairModalState>({
    open: false,
    step: 1,
    alert: null,
    rootCauseCategory: "",
    rootCause: "",
    rootCauseCustom: "",
    fixMethod: "",
    kbSuggestions: [],
  });
  const [dismissedAlertIds, setDismissedAlertIds] = useState<Set<string>>(new Set());
  const [dismissedMaintenanceIds, setDismissedMaintenanceIds] = useState<Set<string>>(new Set());

  const role = user?.role ?? "user";
  const userId = user?.id ?? "u-admin-01";
  const { language, setLanguage, menuItems, messageByKey } =
    useLanguageConfig();

  const availableMenus = useMemo(
    () => menuItems.filter((item) => !item.superOnly || role === "admin"),
    [menuItems, role],
  );

  useEffect(() => {
    if (!availableMenus.some((item) => item.key === activeScreen)) {
      setActiveScreen("dashboard");
    }
  }, [activeScreen, availableMenus]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    activeScreenRef.current = activeScreen;
  }, [activeScreen]);

  useEffect(() => {
    historySearchRef.current = historySearch;
  }, [historySearch]);

  useEffect(() => {
    historyMonthRef.current = historyMonth;
  }, [historyMonth]);

  useEffect(() => {
    historyYearRef.current = historyYear;
  }, [historyYear]);

  useEffect(() => {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, sidebarCollapsed ? "1" : "0");
  }, [sidebarCollapsed]);

  useEffect(() => {
    if (!user) {
      return;
    }

    void loadCoreData();
  }, [user]);

  useEffect(() => {
    if (!user || activeScreen !== "dashboard") {
      return;
    }

    void syncDashboardSilently();
    const timer = window.setInterval(() => {
      void syncDashboardSilently();
    }, 2000);

    return () => window.clearInterval(timer);
  }, [activeScreen, role, user, userId]);

  useEffect(() => {
    if (!user || activeScreen !== "dashboard") {
      return;
    }

    void syncDashboardSilently();
  }, [
    activeScreen,
    alerts,
    maintenance,
    queue,
    role,
    user,
    userId,
  ]);

  useEffect(() => {
    if (!user) {
      return;
    }

    let cancelled = false;
    const sendPresence = async () => {
      try {
        await apiRequest<{ message: string }>("/api/auth/ping", {
          method: "POST",
          role,
          userId,
          body: JSON.stringify({}),
        });
      } catch {
        if (!cancelled) {
          // Keep UI stable when heartbeat fails.
        }
      }
    };

    void sendPresence();
    const timer = window.setInterval(() => {
      void sendPresence();
    }, 30000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [role, user, userId]);

  useEffect(() => {
    if (!user) {
      return;
    }

    if (activeScreen === "queue" && role === "admin") {
      void loadQueueAndUsers();
    }
    if (activeScreen === "sla" && role === "admin") {
      void loadSla();
    }
    if (activeScreen === "notifications" && role === "admin") {
      void loadZabbixSettings();
    }
    if (activeScreen === "inventory") {
      void loadInventory();
    }
    if (activeScreen === "maintenance") {
      void loadMaintenance();
      void loadCustomers();
    }
    if (activeScreen === "appointmentNotifications") {
      void loadMaintenance();
    }
    if (activeScreen === "maintenance" && role === "admin") {
      void loadQueueAndUsers();
    }
    if (activeScreen === "history") {
      void loadHistory(historySearch);
    }
  }, [activeScreen, role, user]);

  useEffect(() => {
    if (!user) {
      return;
    }

    const timer = window.setInterval(() => {
      void syncAlertsSilently();
    }, 60000);

    return () => window.clearInterval(timer);
  }, [role, user, userId]);

  useEffect(() => {
    if (!user) {
      return;
    }

    const timer = window.setInterval(() => {
      void syncMaintenanceSilently();
    }, 60000);

    return () => window.clearInterval(timer);
  }, [user]);

  useEffect(() => {
    if (!user) {
      return;
    }

    const source = createEventStream(
      role,
      userId,
      (payload: RealtimeInvalidateEvent) => {
        setRealtimeConnected(true);
        setRealtimeEventLog((prev) => {
          const next = [
            {
              at: Date.now(),
              eventType: payload.type || "message",
              reason: payload.reason,
              channels: payload.channels,
            },
            ...prev,
          ];
          return next.slice(0, 20);
        });

        if (payload.type !== "invalidate" || !Array.isArray(payload.channels)) {
          return;
        }

        for (const channel of payload.channels) {
          scheduleRealtimeRefresh(channel);
        }
      },
    );

    return () => {
      Object.values(realtimeRefreshTimers.current).forEach((timer) => {
        window.clearTimeout(timer);
      });
      realtimeRefreshTimers.current = {};
      setRealtimeConnected(false);
      source.close();
    };
  }, [role, user, userId]);

  useEffect(() => {
    if (!user) {
      setDismissedMaintenanceIds(new Set());
    }
  }, [user]);

  function normalizeUiError(error: unknown) {
    if (!(error instanceof Error)) {
      return messageByKey("actionFailed");
    }

    let text = error.message.trim();
    if (!text) {
      return messageByKey("actionFailed");
    }

    // Try to parse JSON error messages
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.message && typeof parsed.message === "string") {
          text = parsed.message.trim();
        }
      }
    } catch {
      // If JSON parsing fails, continue with original text
    }

    const compact = text.replace(/\s+/g, " ");
    if (/<html/i.test(compact) || /502 Bad Gateway/i.test(compact)) {
      return language === "th"
        ? "ระบบเชื่อมต่อ backend ชั่วคราวไม่ได้ (502 Bad Gateway) กรุณารีเฟรชแล้วลองใหม่อีกครั้ง"
        : "The app temporarily could not reach the backend (502 Bad Gateway). Refresh and try again.";
    }

    return text;
  }

  async function runAction(action: () => Promise<void>) {
    setLoading(true);
    setMessage("");
    try {
      await action();
    } catch (error) {
      setMessage(normalizeUiError(error));
    } finally {
      setLoading(false);
    }
  }

  async function loadCoreData() {
    await runAction(async () => {
      const baseRequests = await Promise.all([
        apiRequest<DashboardData>("/api/dashboard", { role, userId }),
        apiRequest<{
          escalationQueue: AlertItem[];
          claimPool: AlertItem[];
          inProgress: AlertItem[];
        }>("/api/alerts", { role, userId }),
        apiRequest<{ items: HistoryItem[] }>("/api/history", { role, userId }),
        apiRequest<{ items: InventoryItem[] }>("/api/inventory", { role, userId }),
        apiRequest<{ items: MaintenanceItem[] }>("/api/maintenance", { role, userId }),
      ]);

      const [dashboardData, alertsData, historyData, inventoryData, maintenanceData] = baseRequests;

      setDashboard(dashboardData);
      setDashboardLastUpdatedAt(Date.now());
      setAlerts(alertsData);
      setHistory(historyData.items);
      setInventory(inventoryData.items);
      setMaintenance(maintenanceData.items);

      if (role === "admin") {
        const [queueData, usersData] = await Promise.all([
          apiRequest<{ queue: StaffQueue }>("/api/users-queue", { role, userId }),
          apiRequest<{ items: ManagedUser[] }>("/api/users", { role, userId }),
        ]);
        setQueue(queueData.queue);
        setSystemUsers(usersData.items);
      }
    });
  }

  async function loadQueueAndUsers() {
    await runAction(async () => {
      const [queueData, usersData] = await Promise.all([
        apiRequest<{ queue: StaffQueue }>("/api/users-queue", { role, userId }),
        apiRequest<{ items: ManagedUser[] }>("/api/users", { role, userId }),
      ]);
      setQueue(queueData.queue);
      setSystemUsers(usersData.items);
    });
  }

  async function loadHistory(search: string, month?: number, year?: number) {
    await runAction(async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      const m = month ?? historyMonthRef.current;
      const y = year ?? historyYearRef.current;
      if (m && y) {
        params.set("month", String(m));
        params.set("year", String(y));
      }
      const qs = params.toString() ? `?${params.toString()}` : "";
      const historyData = await apiRequest<{ items: HistoryItem[] }>(
        `/api/history${qs}`,
        { role, userId },
      );
      setHistory(historyData.items);
    });
  }

  async function loadSla() {
    await runAction(async () => {
      const slaData = await apiRequest<SlaData>("/api/sla", { role, userId });
      setSla(slaData);
    });
  }

  async function loadInventory() {
    await runAction(async () => {
      const inventoryData = await apiRequest<{ items: InventoryItem[] }>(
        "/api/inventory",
        { role, userId },
      );
      setInventory(inventoryData.items);
    });
  }

  async function loadZabbixSettings() {
    setLoading(true);
    setMessage("");
    try {
      const settings = await apiRequest<{
        baseUrl: string;
        apiUrl: string;
        apiToken: string;
      }>("/api/zabbix-link", { role, userId });
      setZabbixSettings(settings);
      localStorage.setItem(ZABBIX_LINK_STORAGE_KEY, settings.baseUrl || "");
    } catch {
      const fallbackUrl = localStorage.getItem(ZABBIX_LINK_STORAGE_KEY) || "";
      setZabbixSettings({ baseUrl: fallbackUrl, apiUrl: "", apiToken: "" });
      setMessage(messageByKey("zabbixFallback"));
    } finally {
      setLoading(false);
    }
  }

  async function loadMaintenance() {
    await runAction(async () => {
      await syncMaintenanceSilently();
    });
  }

  async function loadCustomers() {
    await runAction(async () => {
      const customerData = await apiRequest<{ items: CustomerItem[] }>(
        "/api/customers",
        { role, userId },
      );
      setCustomers(customerData.items);
    });
  }

  async function syncAlertsSilently() {
    try {
      const alertsData = await apiRequest<{
        escalationQueue: AlertItem[];
        claimPool: AlertItem[];
        inProgress: AlertItem[];
      }>("/api/alerts", {
        role,
        userId,
      });
      setAlerts((prev) => {
        const incomingMyIds = new Set(
          alertsData.escalationQueue
            .filter((a) => a.assignedTo === userId)
            .map((a) => a.id),
        );
        const prevMyIds = new Set(
          prev.escalationQueue
            .filter((a) => a.assignedTo === userId)
            .map((a) => a.id),
        );
        const hasNew = [...incomingMyIds].some((id) => !prevMyIds.has(id));
        if (hasNew) {
          setDismissedAlertIds(new Set());
        }
        return alertsData;
      });
    } catch {
      // Keep UI stable during background sync failures.
    }
  }

  async function syncDashboardSilently() {
    try {
      const dashboardData = await apiRequest<DashboardData>("/api/dashboard", {
        role,
        userId,
      });
      setDashboard(dashboardData);
      setDashboardLastUpdatedAt(Date.now());
      setMessage((prev) =>
        prev.includes("Cannot connect to backend") ? "" : prev,
      );
    } catch {
      // Keep UI stable during background sync failures.
    }
  }

  async function syncQueueAndUsersSilently(includeUsers = false) {
    if (role !== "admin") {
      return;
    }

    try {
      const queueData = await apiRequest<{ queue: StaffQueue }>(
        "/api/users-queue",
        { role, userId },
      );
      setQueue(queueData.queue);

      if (includeUsers) {
        const usersData = await apiRequest<{ items: ManagedUser[] }>(
          "/api/users",
          { role, userId },
        );
        setSystemUsers(usersData.items);
      }
    } catch {
      // Keep UI stable during background sync failures.
    }
  }

  async function syncCustomersSilently() {
    if (role !== "admin") {
      return;
    }

    try {
      const customerData = await apiRequest<{ items: CustomerItem[] }>(
        "/api/customers",
        { role, userId },
      );
      setCustomers(customerData.items);
    } catch {
      // Keep UI stable during background sync failures.
    }
  }

  async function syncInventorySilently() {
    try {
      const inventoryData = await apiRequest<{ items: InventoryItem[] }>(
        "/api/inventory",
        { role, userId },
      );
      setInventory(inventoryData.items);
    } catch {
      // Keep UI stable during background sync failures.
    }
  }

  async function syncHistorySilently() {
    if (activeScreenRef.current !== "history") {
      return;
    }

    try {
      const params = new URLSearchParams();
      if (historySearchRef.current) params.set("search", historySearchRef.current);
      if (historyMonthRef.current && historyYearRef.current) {
        params.set("month", String(historyMonthRef.current));
        params.set("year", String(historyYearRef.current));
      }
      const qs = params.toString() ? `?${params.toString()}` : "";
      const historyData = await apiRequest<{ items: HistoryItem[] }>(
        `/api/history${qs}`,
        { role, userId },
      );
      setHistory(historyData.items);
    } catch {
      // Keep UI stable during background sync failures.
    }
  }

  async function syncMaintenanceSilently() {
    try {
      const maintenanceData = await apiRequest<{ items: MaintenanceItem[] }>(
        "/api/maintenance",
        { role, userId },
      );
      setMaintenance(maintenanceData.items);
    } catch {
      // Keep UI stable during background sync failures.
    }
  }

  function scheduleRealtimeRefresh(channel: string) {
    if (realtimeRefreshTimers.current[channel]) {
      return;
    }

    realtimeRefreshTimers.current[channel] = window.setTimeout(() => {
      delete realtimeRefreshTimers.current[channel];

      switch (channel) {
        case "alerts":
          void syncAlertsSilently();
          break;
        case "dashboard":
          void syncDashboardSilently();
          break;
        case "queue":
          void syncQueueAndUsersSilently(false);
          break;
        case "users":
          void syncQueueAndUsersSilently(true);
          break;
        case "maintenance":
          void syncMaintenanceSilently();
          break;
        case "customers":
          void syncCustomersSilently();
          break;
        case "inventory":
          void syncInventorySilently();
          break;
        case "history":
          void syncHistorySilently();
          break;
        default:
          break;
      }
    }, 150);
  }

  async function onLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const username = (formData.get("username") || "").toString();
    const password = (formData.get("password") || "").toString();

    await runAction(async () => {
      const result = await apiRequest<{ token: string; user: User }>(
        "/api/auth/login",
        {
          method: "POST",
          body: JSON.stringify({ username, password }),
        },
      );

      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(result.user));
      setUser(result.user);
      setActiveScreen("dashboard");
    });
  }

  function logout() {
    if (user) {
      void apiRequest<{ message: string }>("/api/auth/logout", {
        method: "POST",
        role: user.role,
        userId: user.id,
        body: JSON.stringify({}),
      }).catch(() => {
        // Ignore logout-presence failure.
      });
    }

    sessionStorage.removeItem(STORAGE_KEY);
    setUser(null);
    setMessage("");
  }

  async function acceptAlert(alert: AlertItem, mode: "queue" | "claim") {
    await runAction(async () => {
      const response = await apiRequest<{ alert: AlertItem }>(
        `/api/alerts/${alert.id}/accept`,
        {
          method: "POST",
          role,
          userId,
          body: JSON.stringify({ mode }),
        },
      );

      setAlerts((prev) => {
        const accepted = response.alert;
        return {
          escalationQueue: prev.escalationQueue.filter((item) => item.id !== accepted.id),
          claimPool: prev.claimPool.filter((item) => item.id !== accepted.id),
          inProgress: [accepted, ...prev.inProgress.filter((item) => item.id !== accepted.id)],
        };
      });

      setRepairModal({
        open: true,
        step: 1,
        alert: response.alert,
        rootCauseCategory: "",
        rootCause: "",
        rootCauseCustom: "",
        fixMethod: "",
        kbSuggestions: [],
      });

      await syncAlertsSilently();
    });
  }

  async function deferAlert(alert: AlertItem) {
    await runAction(async () => {
      await apiRequest<{ alert: AlertItem }>(`/api/alerts/${alert.id}/defer`, {
        method: "POST",
        role,
        userId,
        body: JSON.stringify({}),
      });

      await syncAlertsSilently();
      setMessage(messageByKey("alertDeferred"));
    });
  }

  function resumeRepair(alert: AlertItem) {
    // Parse custom root cause details if they exist
    let rootCause = alert.diagnosis || "";
    let rootCauseCustom = "";
    
    if (rootCause.startsWith("other: ")) {
      rootCauseCustom = rootCause.substring(7);
      rootCause = "other";
    } else if (rootCause.startsWith("unknown: ")) {
      rootCauseCustom = rootCause.substring(9);
      rootCause = "unknown";
    }

    setRepairModal({
      open: true,
      step: 2,
      alert,
      rootCauseCategory: "",
      rootCause,
      rootCauseCustom,
      fixMethod: alert.fixMethod || "",
      kbSuggestions: [],
    });
    setMessage(messageByKey("repairResume"));
  }

  async function analyzeRepair() {
    if (!repairModal.alert) {
      return;
    }
    if (!repairModal.rootCause.trim()) {
      setMessage(
        language === "th"
          ? "กรุณาเลือก Root Cause ก่อนกด Analyze"
          : "Please select Root Cause before Analyze.",
      );
      return;
    }
    const alert = repairModal.alert;

    // Combine root cause with custom text if "other" is selected
    const finalRootCause = repairModal.rootCause === "other" && repairModal.rootCauseCustom.trim()
      ? `other: ${repairModal.rootCauseCustom}`
      : repairModal.rootCause === "unknown" && repairModal.rootCauseCustom.trim()
      ? `unknown: ${repairModal.rootCauseCustom}`
      : repairModal.rootCause;

    await runAction(async () => {
      const response = await apiRequest<{ kbSuggestions: HistoryItem[] }>(
        `/api/repairs/${alert.id}/diagnosis`,
        {
          method: "POST",
          role,
          userId,
          body: JSON.stringify({
            rootCause: finalRootCause,
            fixMethod: repairModal.fixMethod,
          }),
        },
      );

      setRepairModal((prev) => ({
        ...prev,
        kbSuggestions: response.kbSuggestions,
      }));
    });
  }

  async function finishRepair() {
    if (!repairModal.alert) {
      return;
    }
    const alert = repairModal.alert;

    // Combine root cause with custom text if "other" is selected
    const finalRootCause = repairModal.rootCause === "other" && repairModal.rootCauseCustom.trim()
      ? `other: ${repairModal.rootCauseCustom}`
      : repairModal.rootCause === "unknown" && repairModal.rootCauseCustom.trim()
      ? `unknown: ${repairModal.rootCauseCustom}`
      : repairModal.rootCause;

    await runAction(async () => {
      await apiRequest(`/api/repairs/${alert.id}/finish`, {
        method: "POST",
        role,
        userId,
        body: JSON.stringify({
          rootCause: finalRootCause,
          fixMethod: repairModal.fixMethod,
        }),
      });

      setRepairModal({
        open: false,
        step: 1,
        alert: null,
        rootCauseCategory: "",
        rootCause: "",
        rootCauseCustom: "",
        fixMethod: "",
        kbSuggestions: [],
      });

      await loadCoreData();
      setMessage(messageByKey("repairFinished"));
    });
  }

  function closeRepairAsPending() {
    setRepairModal((prev) => ({ ...prev, open: false }));
    setMessage(messageByKey("repairModalClosed"));
  }

  async function saveQueue() {
    await runAction(async () => {
      await apiRequest("/api/users-queue", {
        method: "PUT",
        role,
        userId,
        body: JSON.stringify({ queue }),
      });
      await loadQueueAndUsers();
      setMessage(messageByKey("queueSaved"));
    });
  }

  async function createSystemUser(payload: {
    name: string;
    username: string;
    password: string;
    role: "user" | "admin";
  }) {
    await runAction(async () => {
      await apiRequest<{ item: ManagedUser }>("/api/users", {
        method: "POST",
        role,
        userId,
        body: JSON.stringify(payload),
      });
      await loadQueueAndUsers();
      setMessage(messageByKey("userAdded"));
    });
  }

  async function deleteSystemUser(id: string) {
    await runAction(async () => {
      await apiRequest(`/api/users/${id}`, {
        method: "DELETE",
        role,
        userId,
      });
      await loadQueueAndUsers();
      setMessage(messageByKey("userDeleted"));
    });
  }

  async function updateSystemUser(id: string, newRole: Role) {
    await runAction(async () => {
      await apiRequest(`/api/users/${id}`, {
        method: "PATCH",
        role,
        userId,
        body: JSON.stringify({ role: newRole }),
      });
      setSystemUsers((prev) =>
        prev.map((u) => (u.id === id ? { ...u, role: newRole } : u)),
      );
      setMessage(messageByKey("userUpdated"));
    });
  }

  async function resetUserPassword(id: string, newPassword: string) {
    await runAction(async () => {
      await apiRequest(`/api/users/${id}/reset-password`, {
        method: "POST",
        role,
        userId,
        body: JSON.stringify({ newPassword }),
      });
      await loadQueueAndUsers();
      setMessage(messageByKey("passwordReset"));
    });
  }

  async function changeOwnPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;
    if (forceChangeNew !== forceChangeConfirm) {
      setForceChangeError(language === "th" ? "รหัสผ่านไม่ตรงกัน" : "Passwords do not match");
      return;
    }
    setForceChangeError("");
    await runAction(async () => {
      await apiRequest("/api/auth/change-password", {
        method: "POST",
        role: user.role,
        userId: user.id,
        body: JSON.stringify({ newPassword: forceChangeNew }),
      });
      const updated = { ...user, mustChangePassword: false };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      setUser(updated);
      setForceChangeNew("");
      setForceChangeConfirm("");
      setMessage(messageByKey("passwordChanged"));
    });
  }

  async function saveInventory(item: InventoryItem) {
    await runAction(async () => {
      await apiRequest(`/api/inventory/${item.id}`, {
        method: "PUT",
        role,
        userId,
        body: JSON.stringify({
          deviceName: item.deviceName,
          serialNumber: item.serialNumber,
          ipAddress: item.ipAddress,
          warrantyUntil: item.warrantyUntil,
          location: item.location,
        }),
      });
      setEditInventory((prev) => {
        const clone = { ...prev };
        delete clone[item.id];
        return clone;
      });
      await loadInventory();
      setMessage(messageByKey("assetUpdated"));
    });
  }

  async function addInventory(payload: {
    deviceName: string;
    serialNumber: string;
    ipAddress: string;
    warrantyUntil: string;
    location: string;
  }) {
    await runAction(async () => {
      await apiRequest<{ item: InventoryItem }>("/api/inventory", {
        method: "POST",
        role,
        userId,
        body: JSON.stringify(payload),
      });
      await loadInventory();
      setMessage(messageByKey("assetAdded"));
    });
  }

  async function deleteInventory(id: string) {
    await runAction(async () => {
      await apiRequest(`/api/inventory/${id}`, {
        method: "DELETE",
        role,
        userId,
      });
      setEditInventory((prev) => {
        const clone = { ...prev };
        delete clone[id];
        return clone;
      });
      await loadInventory();
      setMessage(messageByKey("assetDeleted"));
    });
  }

  async function saveZabbixSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      await apiRequest("/api/zabbix-link", {
        method: "PUT",
        role,
        userId,
        body: JSON.stringify(zabbixSettings),
      });
      localStorage.setItem(
        ZABBIX_LINK_STORAGE_KEY,
        zabbixSettings.baseUrl || "",
      );
      setMessage(messageByKey("zabbixSaved"));
    } catch {
      localStorage.setItem(
        ZABBIX_LINK_STORAGE_KEY,
        zabbixSettings.baseUrl || "",
      );
      setMessage(messageByKey("zabbixSavedLocalOnly"));
    } finally {
      setLoading(false);
    }
  }

  async function addMaintenance(payload: {
    customerName: string;
    title: string;
    location: string;
    start: string;
    end: string;
    pauseZabbixAlert: boolean;
    assigneeId: string;
  }) {
    await runAction(async () => {
      await apiRequest("/api/maintenance", {
        method: "POST",
        role,
        userId,
        body: JSON.stringify(payload),
      });
      setNewMaintenance({
        customerName: "",
        title: "",
        location: "",
        start: "",
        end: "",
        pauseZabbixAlert: true,
        assigneeId: "",
      });
      await loadMaintenance();
      const customerData = await apiRequest<{ items: CustomerItem[] }>(
        "/api/customers",
        { role, userId },
      );
      setCustomers(customerData.items);
      setMessage(messageByKey("maintenanceCreated"));
    });
  }

  async function updateMaintenance(
    id: string,
    payload: {
      customerName: string;
      title: string;
      location: string;
      start: string;
      end: string;
      pauseZabbixAlert: boolean;
      assigneeId: string;
    },
  ) {
    await runAction(async () => {
      await apiRequest(`/api/maintenance/${id}`, {
        method: "PUT",
        role,
        userId,
        body: JSON.stringify(payload),
      });
      setEditingMaintenanceId(null);
      setNewMaintenance({
        customerName: "",
        title: "",
        location: "",
        start: "",
        end: "",
        pauseZabbixAlert: true,
        assigneeId: "",
      });
      await loadMaintenance();
      const customerData = await apiRequest<{ items: CustomerItem[] }>(
        "/api/customers",
        { role, userId },
      );
      setCustomers(customerData.items);
      setMessage(messageByKey("maintenanceUpdated"));
    });
  }

  async function deleteMaintenance(id: string) {
    await runAction(async () => {
      await apiRequest(`/api/maintenance/${id}`, {
        method: "DELETE",
        role,
        userId,
      });

      if (editingMaintenanceId === id) {
        setEditingMaintenanceId(null);
        setNewMaintenance({
          customerName: "",
          title: "",
          location: "",
          start: "",
          end: "",
          pauseZabbixAlert: true,
          assigneeId: "",
        });
      }

      await loadMaintenance();
      setMessage(messageByKey("maintenanceDeleted"));
    });
  }

  async function acknowledgeMaintenance(id: string) {
    await runAction(async () => {
      await apiRequest(`/api/maintenance/${id}/ack`, {
        method: "POST",
        role,
        userId,
      });
      await loadMaintenance();
      setMessage(messageByKey("maintenanceAcknowledged"));
    });
  }

  async function completeMaintenance(id: string) {
    await runAction(async () => {
      await apiRequest(`/api/maintenance/${id}/complete`, {
        method: "POST",
        role,
        userId,
      });
      await loadMaintenance();
      setMessage(messageByKey("maintenanceCompleted"));
    });
  }

  if (!user) {
    return (
      <LoginPage
        onLogin={onLogin}
        loading={loading}
        message={message}
        language={language}
      />
    );
  }

  if (user.mustChangePassword) {
    return (
      <div className="login-page">
        <div className="login-backdrop-pattern" aria-hidden="true" />
        <div className="login-panel">
          <h2 style={{ color: "#f1f6ff", fontSize: "24px", marginTop: 0 }}>
            {language === "th" ? "เปลี่ยนรหัสผ่าน" : "Change Password"}
          </h2>
          <p style={{ color: "#9aaec7", fontSize: "13px", lineHeight: 1.5, margin: "8px 0 20px", padding: 0 }}>
            {language === "th"
              ? "ผู้ดูแลระบบได้รีเซ็ตรหัสผ่านของคุณ กรุณาตั้งรหัสผ่านใหม่ก่อนดำเนินการต่อ"
              : "Your password was reset by an administrator. Please set a new password to continue."}
          </p>
          <form className="login-form" style={{ display: "grid", gap: "12px" }} onSubmit={(e) => void changeOwnPassword(e)}>
            <label>
              {language === "th" ? "รหัสผ่านใหม่" : "New Password"}
              <input
                type="password"
                value={forceChangeNew}
                onChange={(e) => setForceChangeNew(e.target.value)}
                required
                autoFocus
              />
            </label>
            <label>
              {language === "th" ? "ยืนยันรหัสผ่านใหม่" : "Confirm New Password"}
              <input
                type="password"
                value={forceChangeConfirm}
                onChange={(e) => setForceChangeConfirm(e.target.value)}
                required
              />
            </label>
            {forceChangeError && <p className="error-text">{forceChangeError}</p>}
            {message && <p className="error-text">{message}</p>}
            <button type="submit" className="login-submit" disabled={loading}>
              {loading
                ? language === "th" ? "กำลังบันทึก..." : "Saving..."
                : language === "th" ? "บันทึกรหัสผ่านใหม่" : "Save New Password"}
            </button>
          </form>
          <p className="login-footnote">
            {language === "th" ? `เข้าสู่ระบบในฐานะ: ${user.username}` : `Signed in as: ${user.username}`}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`app-shell ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
      <Sidebar
        user={user}
        availableMenus={availableMenus}
        activeScreen={activeScreen}
        setActiveScreen={setActiveScreen}
        logout={logout}
        collapsed={sidebarCollapsed}
        toggleCollapsed={() => setSidebarCollapsed((prev) => !prev)}
        language={language}
      />

      <main className="content">
        <TopBar
          menuItems={menuItems}
          activeScreen={activeScreen}
          refresh={loadCoreData}
          loading={loading}
          language={language}
          onLanguageChange={setLanguage}
        />
        {message && <div className="message-box">{message}</div>}

        {activeScreen === "dashboard" && dashboard && (
          <DashboardPage
            dashboard={dashboard}
            language={language}
            lastUpdatedAt={dashboardLastUpdatedAt}
            realtimeConnected={realtimeConnected}
            realtimeEventLog={realtimeEventLog}
            onNavigateToHistory={(category) => {
              setHistoryRootCauseCategory(category);
              setActiveScreen("history");
              void loadHistory(historySearch);
            }}
          />
        )}
        {activeScreen === "alerts" && (
          <AlertBoardPage
            alerts={alerts}
            now={now}
            userId={userId}
            onAcceptAlert={acceptAlert}
            onDeferAlert={deferAlert}
            onResumeRepair={resumeRepair}
            language={language}
          />
        )}
        {activeScreen === "queue" && role === "admin" && (
          <QueueManagementPage
            queue={queue}
            setQueue={setQueue}
            saveQueue={saveQueue}
            systemUsers={systemUsers}
            createSystemUser={createSystemUser}
            deleteSystemUser={deleteSystemUser}
            updateSystemUser={updateSystemUser}
            resetUserPassword={resetUserPassword}
            language={language}
          />
        )}
        {activeScreen === "history" && (
          <HistoryPage
            history={history}
            maintenance={maintenance}
            historySearch={historySearch}
            setHistorySearch={setHistorySearch}
            loadHistory={loadHistory}
            exportHistory={downloadHistoryExport}
            role={role}
            userId={userId}
            language={language}
            rootCauseCategory={historyRootCauseCategory}
            onClearCategoryFilter={() => setHistoryRootCauseCategory("")}
            historyMonth={historyMonth}
            historyYear={historyYear}
            onMonthYearChange={(month, year) => {
              setHistoryMonth(month);
              setHistoryYear(year);
              void loadHistory(historySearch, month, year);
            }}
          />
        )}
        {activeScreen === "sla" && role === "admin" && sla && (
          <SlaPage sla={sla} language={language} />
        )}
        {activeScreen === "inventory" && (
          <InventoryPage
            inventory={inventory}
            editInventory={editInventory}
            setEditInventory={setEditInventory}
            role={role}
            saveInventory={saveInventory}
            addInventory={addInventory}
            deleteInventory={deleteInventory}
            language={language}
          />
        )}
        {activeScreen === "notifications" && role === "admin" && (
          <NotificationSettingsPage
            settings={zabbixSettings}
            setSettings={(value) => setZabbixSettings(value)}
            saveSettings={saveZabbixSettings}
            language={language}
          />
        )}
        {activeScreen === "appointmentNotifications" && (
          <AppointmentNotificationsPage
            maintenance={maintenance}
            role={role}
            user={user}
            acknowledgeMaintenance={acknowledgeMaintenance}
            completeMaintenance={completeMaintenance}
            language={language}
          />
        )}
        {activeScreen === "maintenance" && role === "admin" && (
          <MaintenancePage
            maintenance={maintenance}
            customers={customers}
            role={role}
            user={user}
            systemUsers={systemUsers}
            newMaintenance={newMaintenance}
            setNewMaintenance={setNewMaintenance}
            addMaintenance={addMaintenance}
            editingMaintenanceId={editingMaintenanceId}
            setEditingMaintenanceId={setEditingMaintenanceId}
            updateMaintenance={updateMaintenance}
            deleteMaintenance={deleteMaintenance}
            language={language}
          />
        )}
        {activeScreen === "analytics" && (
          <AnalyticsPage
            dashboard={dashboard}
            language={language}
          />
        )}
      </main>

      <RepairModal
        repairModal={repairModal}
        setRepairModal={setRepairModal}
        analyzeRepair={analyzeRepair}
        finishRepair={finishRepair}
        onClosePending={closeRepairAsPending}
        language={language}
      />

      <div style={{
        position: "fixed",
        bottom: "24px",
        right: "24px",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        zIndex: 9999,
        pointerEvents: "none",
      }}>
        <div style={{ pointerEvents: "auto" }}>
          <AlertQueueToast
            myPendingAlerts={alerts.escalationQueue.filter(
              (a) => a.assignedTo === userId && !dismissedAlertIds.has(a.id),
            )}
            now={now}
            language={language}
            onAccept={(alert) => {
              setActiveScreen("alerts");
              void acceptAlert(alert, "queue");
            }}
            onDefer={(alert) => {
              void deferAlert(alert);
            }}
            onDismiss={(id) =>
              setDismissedAlertIds((prev) => new Set([...prev, id]))
            }
          />
        </div>

        <div style={{ pointerEvents: "auto" }}>
          <MaintenanceDueToast
        duePlans={maintenance.filter((item) => {
          // Only show if status is scheduled
          if (item.status !== "scheduled") {
            return false;
          }
          
          // Don't show if already dismissed
          if (dismissedMaintenanceIds.has(item.id)) {
            return false;
          }
          
          // Only show if maintenance time has arrived
          const startTime = Date.parse(item.start);
          if (!Number.isFinite(startTime) || startTime > now) {
            return false;
          }
          
          // Only show if maintenance window hasn't ended
          const endTime = Date.parse(item.end);
          if (!Number.isFinite(endTime) || endTime < now) {
            return false;
          }
          
          // Admin sees all due maintenance
          if (role === "admin") {
            return true;
          }
          
          // Non-admin only sees if:
          // 1. Has a valid assigneeId
          // 2. assigneeId matches their userId
          // 3. userId is not the default value
          if (!item.assigneeId || item.assigneeId !== userId || userId === "u-admin-01") {
            return false;
          }
          
          return true;
        })}
        now={now}
        language={language}
        onOpen={(id) => {
          setActiveScreen("appointmentNotifications");
          setDismissedMaintenanceIds((prev) => new Set([...prev, id]));
        }}
        onDismiss={(id) => {
          setDismissedMaintenanceIds((prev) => new Set([...prev, id]));
        }}
          />
        </div>
      </div>
    </div>
  );
}

export default App;
