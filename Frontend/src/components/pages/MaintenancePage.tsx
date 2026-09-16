import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import type { Dispatch, SetStateAction } from "react";
import { Trash2 } from "lucide-react";
import type {
  CustomerItem,
  MaintenanceItem,
  ManagedUser,
  Role,
  User,
} from "../../types";
import ConfirmDialog from "../ConfirmDialog";
import "./MaintenancePage.css";

interface NewMaintenance {
  customerName: string;
  title: string;
  location: string;
  start: string;
  end: string;
  pauseZabbixAlert: boolean;
  assigneeId: string;
}

interface MaintenancePageProps {
  maintenance: MaintenanceItem[];
  customers: CustomerItem[];
  role: Role;
  user: User;
  systemUsers: ManagedUser[];
  newMaintenance: NewMaintenance;
  setNewMaintenance: Dispatch<SetStateAction<NewMaintenance>>;
  addMaintenance: (payload: NewMaintenance) => Promise<void>;
  editingMaintenanceId: string | null;
  setEditingMaintenanceId: Dispatch<SetStateAction<string | null>>;
  updateMaintenance: (id: string, payload: NewMaintenance) => Promise<void>;
  deleteMaintenance: (id: string) => Promise<void>;
  language: "th" | "en";
}

function toInputDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function MaintenancePage({
  maintenance,
  customers,
  role,
  user,
  systemUsers,
  newMaintenance,
  setNewMaintenance,
  addMaintenance,
  editingMaintenanceId,
  setEditingMaintenanceId,
  updateMaintenance,
  deleteMaintenance,
  language,
}: MaintenancePageProps) {
  const th = language === "th";
  const isSuperAdmin = role === "admin";
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [confirmTarget, setConfirmTarget] = useState<MaintenanceItem | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 10000);

    return () => window.clearInterval(timer);
  }, []);

  const duePending = maintenance.filter((item) => {
    if (item.status !== "scheduled") {
      return false;
    }
    const startTime = Date.parse(item.start);
    if (!Number.isFinite(startTime) || startTime > nowMs) {
      return false;
    }
    if (isSuperAdmin) {
      return true;
    }
    return item.assigneeId === user.id;
  });

  const hasDuePending = duePending.length > 0;
  const activeMaintenance = maintenance.filter(
    (item) => item.status !== "completed",
  );

  function getStatusLabel(item: MaintenanceItem) {
    if (item.status === "completed") {
      return th ? "เสร็จแล้ว" : "Completed";
    }
    if (item.status === "in_progress") {
      return th ? "กำลังดำเนินงาน" : "In Progress";
    }
    if (Date.parse(item.start) <= nowMs) {
      return th ? "ถึงเวลานัดแล้ว" : "Due Now";
    }
    return th ? "รอดำเนินงาน" : "Scheduled";
  }

  function startEdit(item: MaintenanceItem) {
    setEditingMaintenanceId(item.id);
    setNewMaintenance({
      customerName: item.customerName || "",
      title: item.title,
      location: item.location,
      start: toInputDateTime(item.start),
      end: toInputDateTime(item.end),
      pauseZabbixAlert: item.pauseZabbixAlert,
      assigneeId: item.assigneeId,
    });
  }

  function cancelEdit() {
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

  async function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    function toUtcIso(local: string) {
      if (!local) return local;
      const d = new Date(local);
      return Number.isFinite(d.getTime()) ? d.toISOString() : local;
    }
    const payload = {
      ...newMaintenance,
      start: toUtcIso(newMaintenance.start),
      end: toUtcIso(newMaintenance.end),
    };
    if (editingMaintenanceId) {
      await updateMaintenance(editingMaintenanceId, payload);
      return;
    }
    await addMaintenance(payload);
  }

  function confirmDelete(item: MaintenanceItem) {
    setConfirmTarget(item);
  }

  return (
    <section className="maintenance-page maintenance-layout">
      {hasDuePending && (
        <article className="card maintenance-due-card full-width">
          <strong>
            {th
              ? "ถึงเวลานัด Maintenance แล้ว กรุณาตอบรับและยืนยันหลังดำเนินงานเสร็จ"
              : "A maintenance window is due now. Please acknowledge and confirm after completion."}
          </strong>
        </article>
      )}

      <article className="card maintenance-table-card">
        <h3>{th ? "ปฏิทินช่วงเวลาบำรุงรักษา" : "Planned Downtime Calendar"}</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{th ? "ตารางงาน" : "Work scheduler"}</th>
                <th>{th ? "หัวข้อ" : "Title"}</th>
                <th>{th ? "ผู้ปฏิบัติงาน" : "Assignee"}</th>
                <th>{th ? "สถานที่" : "Location"}</th>
                <th>{th ? "เริ่ม" : "Start"}</th>
                <th>{th ? "สิ้นสุด" : "End"}</th>
                <th>{th ? "หยุดแจ้งเตือน" : "Pause Alert"}</th>
                <th>{th ? "สถานะ" : "Status"}</th>
                <th>{th ? "การตอบรับ" : "Acknowledgement"}</th>
                <th>{th ? "การจัดการ" : "Action"}</th>
              </tr>
            </thead>
            <tbody>
              {activeMaintenance.length === 0 && (
                <tr>
                  <td colSpan={10} className="empty-cell">
                    {th
                      ? "ไม่มีแผนที่กำลังดำเนินอยู่"
                      : "No active maintenance plans."}
                  </td>
                </tr>
              )}
              {activeMaintenance.map((item) => {
                const dueNow =
                  item.status === "scheduled" &&
                  Date.parse(item.start) <= nowMs;

                return (
                  <tr key={item.id}>
                    <td>{item.customerName || "-"}</td>
                    <td>{item.title}</td>
                    <td>{item.assigneeName}</td>
                    <td>{item.location}</td>
                    <td>{new Date(item.start).toLocaleString()}</td>
                    <td>{new Date(item.end).toLocaleString()}</td>
                    <td>
                      <span
                        className={`status-chip ${item.pauseZabbixAlert ? "busy" : "ok"}`}
                      >
                        {item.pauseZabbixAlert ? "Yes" : "No"}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`status-chip maintenance-status ${
                          item.status === "completed"
                            ? "ok"
                            : item.status === "in_progress"
                              ? "busy"
                              : dueNow
                                ? "warn"
                                : "good"
                        }`}
                      >
                        {getStatusLabel(item)}
                      </span>
                    </td>
                    <td>
                      {item.acknowledgedAt ? (
                        <span className="maintenance-meta">
                          {item.acknowledgedByName ||
                            item.acknowledgedBy ||
                            "-"}
                          <small>
                            {new Date(item.acknowledgedAt).toLocaleString()}
                          </small>
                        </span>
                      ) : (
                        <span className="muted">
                          {th ? "ยังไม่ตอบรับ" : "Not yet"}
                        </span>
                      )}
                    </td>
                    <td>
                      <div className="maintenance-actions">
                        {isSuperAdmin && (
                          <>
                            <button
                              type="button"
                              className="maintenance-edit-btn"
                              onClick={() => startEdit(item)}
                            >
                              {th ? "แก้ไข" : "Edit"}
                            </button>
                            <button
                              type="button"
                              className="maintenance-delete-btn"
                              aria-label={th ? `ลบ ${item.title}` : `Delete ${item.title}`}
                              title={th ? `ลบ ${item.title}` : `Delete ${item.title}`}
                              onClick={() => void confirmDelete(item)}
                            >
                              <Trash2 size={15} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </article>

      {isSuperAdmin && (
        <article className="card maintenance-form-card">
          <h3>
            {editingMaintenanceId
              ? th
                ? "แก้ไขแผน Maintenance"
                : "Edit Maintenance Plan"
              : th
                ? "ตั้งเวลา Maintenance"
                : "Schedule Maintenance"}
          </h3>
          <form
            onSubmit={(event) => void submitForm(event)}
            className="form-grid maintenance-form"
          >
            <label className="field-title">
              {th ? "ตารางงาน" : "Work schedule"}
              <input
                value={newMaintenance.customerName}
                list="maintenance-customer-options"
                onChange={(event) => {
                  const selectedCustomerName = event.target.value;
                  const selectedCustomer = customers.find(
                    (item) => item.name === selectedCustomerName,
                  );

                  setNewMaintenance((prev) => ({
                    ...prev,
                    customerName: selectedCustomerName,
                    location: selectedCustomer
                      ? selectedCustomer.location
                      : prev.location,
                  }));
                }}
                placeholder={
                  th
                    ? "พิมพ์ชื่อตารางงาน หรือเลือกจากรายการ"
                    : "Type Work schedule name or choose from list"
                }
                required
              />
              <datalist id="maintenance-customer-options">
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.name}>
                    {customer.location}
                  </option>
                ))}
              </datalist>
            </label>
            <label className="field-title">
              {th ? "หัวข้อ" : "Title"}
              <input
                value={newMaintenance.title}
                onChange={(event) =>
                  setNewMaintenance((prev) => ({
                    ...prev,
                    title: event.target.value,
                  }))
                }
                required
              />
            </label>
            <label className="field-title">
              {th ? "สถานที่" : "Location"}
              <input
                value={newMaintenance.location}
                onChange={(event) =>
                  setNewMaintenance((prev) => ({
                    ...prev,
                    location: event.target.value,
                  }))
                }
                placeholder={
                  th ? "เช่น Bangkok HQ - Rack C2" : "e.g. Bangkok HQ - Rack C2"
                }
                required
              />
            </label>
            <label className="field-title">
              {th ? "ผู้ปฏิบัติงาน" : "Assignee"}
              <select
                value={newMaintenance.assigneeId}
                onChange={(event) =>
                  setNewMaintenance((prev) => ({
                    ...prev,
                    assigneeId: event.target.value,
                  }))
                }
                required
              >
                <option value="">
                  {th ? "เลือกผู้ปฏิบัติงาน" : "Select assignee"}
                </option>
                {systemUsers.map((staff) => (
                  <option key={staff.id} value={staff.id}>
                    {staff.name} (
                    {staff.role === "admin" ? "admin" : "user"})
                  </option>
                ))}
              </select>
            </label>
            <div className="maintenance-row">
              <label>
                {th ? "เริ่ม" : "Start"}
                <input
                  type="datetime-local"
                  value={newMaintenance.start}
                  onChange={(event) =>
                    setNewMaintenance((prev) => ({
                      ...prev,
                      start: event.target.value,
                    }))
                  }
                  required
                />
              </label>
              <label>
                {th ? "สิ้นสุด" : "End"}
                <input
                  type="datetime-local"
                  value={newMaintenance.end}
                  onChange={(event) =>
                    setNewMaintenance((prev) => ({
                      ...prev,
                      end: event.target.value,
                    }))
                  }
                  required
                />
              </label>
            </div>
            <div className="maintenance-actions-row">
              <div className="maintenance-form-buttons">
                {editingMaintenanceId && (
                  <button
                    type="button"
                    className="secondary"
                    onClick={cancelEdit}
                  >
                    {th ? "ยกเลิก" : "Cancel"}
                  </button>
                )}
                <button type="submit">
                  {editingMaintenanceId
                    ? th
                      ? "บันทึกการแก้ไข"
                      : "Save Changes"
                    : th
                      ? "สร้างแผน"
                      : "Create Plan"}
                </button>
              </div>
            </div>
          </form>
        </article>
      )}

      <ConfirmDialog
        open={confirmTarget !== null}
        title={th ? "ยืนยันการลบ" : "Confirm Delete"}
        message={
          confirmTarget
            ? th
              ? `ต้องการลบแผน "${confirmTarget.title}" ใช่หรือไม่?`
              : `Delete maintenance plan "${confirmTarget.title}"?`
            : ""
        }
        confirmLabel={th ? "ลบ" : "Delete"}
        cancelLabel={th ? "ยกเลิก" : "Cancel"}
        onConfirm={() => {
          if (confirmTarget) void deleteMaintenance(confirmTarget.id);
          setConfirmTarget(null);
        }}
        onCancel={() => setConfirmTarget(null)}
      />
    </section>
  );
}

export default MaintenancePage;
