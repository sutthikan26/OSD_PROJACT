import { useEffect, useState } from "react";
import type { MenuItem, ScreenKey } from "../types";
import type { User } from "../../types";
import {
  BarChart3,
  Boxes,
  CalendarCog,
  Bell,
  History,
  LayoutDashboard,
  Link2,
  DoorOpen,
  PanelLeftClose,
  PanelLeftOpen,
  Siren,
  Waypoints,
  TrendingUp,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import logoExpanded from "../../Img/logo03.png";
import logoCollapsed from "../../Img/Logo02.png";
import "./Sidebar.css";

interface SidebarProps {
  user: User;
  availableMenus: MenuItem[];
  activeScreen: ScreenKey;
  setActiveScreen: (screen: ScreenKey) => void;
  logout: () => void;
  collapsed: boolean;
  toggleCollapsed: () => void;
  language: "th" | "en";
}

const MENU_ICONS: Record<ScreenKey, LucideIcon> = {
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

function Sidebar({
  user,
  availableMenus,
  activeScreen,
  setActiveScreen,
  logout,
  collapsed,
  toggleCollapsed,
  language,
}: SidebarProps) {
  const [isHoveringCollapsed, setIsHoveringCollapsed] = useState(false);
  const isCollapsedView = collapsed && !isHoveringCollapsed;
  const isHoverExpanded = collapsed && isHoveringCollapsed;

  useEffect(() => {
    if (!collapsed) {
      setIsHoveringCollapsed(false);
    }
  }, [collapsed]);

  const CollapseIcon = collapsed ? PanelLeftOpen : PanelLeftClose;
  const userInitial = user.name.trim().charAt(0).toUpperCase();
  const th = language === "th";
  const userRoleLabel =
    user.role === "admin"
      ? th
        ? "ผู้ดูแลสูงสุด"
        : "Admin"
      : th
        ? "ผู้ใช้งาน"
        : "User";

  return (
    <aside
      className={`sidebar ${isCollapsedView ? "collapsed" : ""} ${isHoverExpanded ? "hover-expanded" : ""}`}
      onMouseEnter={() => {
        if (collapsed) {
          setIsHoveringCollapsed(true);
        }
      }}
      onMouseLeave={() => {
        setIsHoveringCollapsed(false);
      }}
    >
      <div className="sidebar-brand">
        <h2>
          {isCollapsedView ? (
            <button
              type="button"
              className="brand-logo-button"
              onClick={toggleCollapsed}
              title={th ? "ขยายเมนูด้านข้าง" : "Expand Sidebar"}
              aria-label="Expand sidebar"
            >
              <img
                src={logoCollapsed}
                alt="Sentinel NOC"
                className="brand-logo-image brand-logo-collapsed"
              />
            </button>
          ) : (
            <>
              <span className="brand-title-wrap">
                <span>
                  <img
                    src={logoExpanded}
                    alt="Logo"
                    className="brand-logo-image brand-logo-expanded"
                  />
                </span>
              </span>
              <button
                type="button"
                className="sidebar-toggle"
                onClick={toggleCollapsed}
                title={
                  collapsed
                    ? th
                      ? "ขยายเมนูด้านข้าง"
                      : "Expand Sidebar"
                    : th
                      ? "ย่อเมนูด้านข้าง"
                      : "Collapse Sidebar"
                }
                aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                <CollapseIcon size={16} />
              </button>
            </>
          )}
        </h2>
      </div>

      <nav>
        {availableMenus.map((menu) => {
          const Icon = MENU_ICONS[menu.key];
          return (
            <button
              key={menu.key}
              className={`menu-item ${activeScreen === menu.key ? "active" : ""}`}
              onClick={() => setActiveScreen(menu.key)}
              title={isCollapsedView ? menu.label : undefined}
            >
              <span className="menu-icon">
                <Icon size={16} />
              </span>
              <span className="sidebar-text">{menu.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <button
          onClick={logout}
          className="logout-btn"
          title={isCollapsedView ? (th ? "ออกจากระบบ" : "Logout") : undefined}
        >
          <DoorOpen size={16} />
          <span className="sidebar-text">{th ? "ออกจากระบบ" : "Logout"}</span>
        </button>

        {!isCollapsedView ? (
          <div className="sidebar-user" title={userRoleLabel}>
            <span className="user-avatar" aria-hidden="true">
              {userInitial || "U"}
            </span>
            <span className="user-meta">
              <span className="user-name">{user.name}</span>
              <span className="role-badge">{userRoleLabel}</span>
            </span>
          </div>
        ) : null}
      </div>
    </aside>
  );
}

export default Sidebar;
