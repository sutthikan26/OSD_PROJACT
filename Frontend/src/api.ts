import type { Role } from "./types";

const envBase = (import.meta.env.VITE_API_BASE ?? import.meta.env.VITE_API_URL ?? "").replace(/\/+$/, "");
const API_BASE = envBase || "https://osd-projact.onrender.com";

interface RequestOptions extends RequestInit {
  role?: Role;
  userId?: string;
}

export interface RealtimeInvalidateEvent {
  type: string;
  channels?: string[];
  reason?: string;
  timestamp?: string;
}

function buildApiUrl(path: string): string {
  return `${API_BASE}${path}`;
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const headers = new Headers(options.headers ?? {});
  headers.set("Content-Type", "application/json");
  headers.set("x-role", options.role ?? "admin");
  headers.set("x-user-id", options.userId ?? "1");

  let response: Response;
  try {
    response = await fetch(buildApiUrl(path), {
      ...options,
      headers,
    });
  } catch {
    throw new Error("Cannot connect to backend. Check Docker/backend service.");
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `Request failed: ${response.status}`);
  }

  return (await response.json()) as T;
}

export async function downloadHistoryExport(
  role: Role,
  userId: string,
  month?: number,
  year?: number,
): Promise<void> {
  const params = new URLSearchParams();
  if (month && year) {
    params.set("month", String(month));
    params.set("year", String(year));
  }
  const qs = params.toString() ? `?${params.toString()}` : "";
  const response = await fetch(buildApiUrl(`/api/history/export${qs}`), {
    headers: {
      "x-role": role,
      "x-user-id": userId,
    },
  });

  if (!response.ok) {
    throw new Error("Export failed");
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  const MONTH_NAMES_EN = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const label = month && year ? `${MONTH_NAMES_EN[month - 1]}-${year}` : "all";
  anchor.download = `repair-history-${label}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(url);
}

export function createEventStream(
  role: Role,
  userId: string,
  onMessage: (payload: RealtimeInvalidateEvent) => void,
  onError?: () => void,
): EventSource {
  const params = new URLSearchParams({
    role,
    userId,
  });
  const eventSource = new EventSource(buildApiUrl(`/api/events?${params.toString()}`));

  const handleMessage = (event: MessageEvent<string>) => {
    try {
      onMessage(JSON.parse(event.data) as RealtimeInvalidateEvent);
    } catch {
      // Ignore malformed SSE payloads.
    }
  };

  eventSource.addEventListener("connected", handleMessage as EventListener);
  eventSource.addEventListener("invalidate", handleMessage as EventListener);
  eventSource.onerror = () => {
    onError?.();
  };

  return eventSource;
}