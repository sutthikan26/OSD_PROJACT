// src/api.ts
var API_BASE = "http://localhost:4000";
async function apiRequest(path, options = {}) {
  const headers = new Headers(options.headers ?? {});
  headers.set("Content-Type", "application/json");
  headers.set("x-role", options.role ?? "admin");
  headers.set("x-user-id", options.userId ?? "u-admin-01");
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers
    });
  } catch {
    throw new Error(
      `Cannot connect to backend at ${API_BASE}. Please start Backend server.`
    );
  }
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `Request failed: ${response.status}`);
  }
  return await response.json();
}
async function downloadHistoryExport(role, userId) {
  const response = await fetch(`${API_BASE}/api/history/export`, {
    headers: {
      "x-role": role,
      "x-user-id": userId
    }
  });
  if (!response.ok) {
    throw new Error("Export failed");
  }
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "history-export.csv";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(url);
}
export {
  apiRequest,
  downloadHistoryExport
};
