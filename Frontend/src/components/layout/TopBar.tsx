import type { MenuItem, ScreenKey } from "../types";
import {
  BarChart3,
  Bell,
  Boxes,
  CalendarCog,
  History,
  LayoutDashboard,
  Link2,
  RefreshCcw,
  Siren,
  TrendingUp,
  Waypoints,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import "./TopBar.css";

interface TopBarProps {
  menuItems: MenuItem[];
  activeScreen: ScreenKey;
  refresh: () => Promise<void>;
  loading: boolean;
  language: "th" | "en";
  onLanguageChange: (language: "th" | "en") => void;
}

const PAGE_ICONS: Record<ScreenKey, LucideIcon> = {
  dashboard: LayoutDashboard,
  alerts: Siren,
  queue: Waypoints,
  history: History,
  sla: BarChart3,
  inventory: Boxes,
  notifications: Link2,
  appointmentNotifications: Bell,
  maintenance: CalendarCog,
  analytics: TrendingUp,
};

function TopBar({
  menuItems,
  activeScreen,
  refresh,
  loading,
  language,
  onLanguageChange,
}: TopBarProps) {
  const currentTitle = menuItems.find(
    (item) => item.key === activeScreen,
  )?.label;
  const Icon = PAGE_ICONS[activeScreen];
  const th = language === "th";

  return (
    <header className="top-bar">
      <div>
        <h1>
          <span className="title-icon">
            <Icon size={16} />
          </span>
          {currentTitle}
        </h1>
        <p className="muted top-bar-subtitle">
          {th
            ? "ศูนย์บัญชาการ NOC / เวิร์กโฟลว์องค์กร"
            : "NOC Command Center / Enterprise Workflow"}
        </p>
      </div>
      <div className="top-bar-actions">
        <div
          className="language-switch"
          role="group"
          aria-label="Language switch"
        >
          <button
            type="button"
            className={`lang-btn ${language === "th" ? "active" : ""}`}
            onClick={() => onLanguageChange("th")}
          >
            TH
          </button>
          <button
            type="button"
            className={`lang-btn ${language === "en" ? "active" : ""}`}
            onClick={() => onLanguageChange("en")}
          >
            EN
          </button>
        </div>
        <button
          className="top-refresh-btn"
          onClick={() => void refresh()}
          disabled={loading}
        >
          <RefreshCcw size={15} /> {th ? "รีเฟรช" : "Refresh"}
        </button>
      </div>
    </header>
  );
}

export default TopBar;
