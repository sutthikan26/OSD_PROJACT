import type { FormEvent } from "react";
import "./NotificationSettingsPage.css";

interface ZabbixLinkSettings {
  baseUrl: string;
  apiUrl: string;
  apiToken: string;
}

interface NotificationSettingsPageProps {
  settings: ZabbixLinkSettings;
  setSettings: (value: ZabbixLinkSettings) => void;
  saveSettings: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  language: "th" | "en";
}

function NotificationSettingsPage({
  settings,
  setSettings,
  saveSettings,
  language,
}: NotificationSettingsPageProps) {
  const th = language === "th";
  const canOpen = settings.baseUrl.trim().length > 0;

  return (
    <section className="card notifications-page">
      <h3>Zabbix Integration Settings</h3>
      <p className="muted">
        {th
          ? "ตั้งค่า URL และ API credentials สำหรับเชื่อมต่อกับ Zabbix"
          : "Configure URL and API credentials for Zabbix integration"}
      </p>
      <form
        className="form-grid"
        onSubmit={(event) => void saveSettings(event)}
      >
        <label>
          {th ? "URL ของ Zabbix" : "Zabbix URL"}
          <input
            type="url"
            value={settings.baseUrl}
            placeholder={
              th
                ? "เช่น https://zabbix.example.com"
                : "e.g. https://zabbix.example.com"
            }
            onChange={(event) =>
              setSettings({
                ...settings,
                baseUrl: event.target.value,
              })
            }
            required
          />
        </label>
        <label>
          {th ? "Zabbix API URL" : "Zabbix API URL"}
          <input
            type="url"
            value={settings.apiUrl}
            placeholder="http://192.168.56.110/api_jsonrpc.php"
            onChange={(event) =>
              setSettings({
                ...settings,
                apiUrl: event.target.value,
              })
            }
            required
          />
        </label>
        <label>
          {th ? "Zabbix API Token" : "Zabbix API Token"}
          <input
            type="password"
            value={settings.apiToken}
            placeholder="d5144844d2325743ae09eede597fb44b"
            onChange={(event) =>
              setSettings({
                ...settings,
                apiToken: event.target.value,
              })
            }
            required
          />
        </label>
        <div className="zabbix-actions">
          <button type="submit">{th ? "บันทึกการตั้งค่า" : "Save Settings"}</button>
          <button
            type="button"
            className="secondary"
            disabled={!canOpen}
            onClick={() => {
              if (!canOpen) {
                return;
              }
              window.open(settings.baseUrl, "_blank", "noopener,noreferrer");
            }}
          >
            {th ? "เปิด Zabbix" : "Open Zabbix"}
          </button>
        </div>
      </form>
    </section>
  );
}

export default NotificationSettingsPage;
