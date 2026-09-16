import { useState } from "react";
import type { Dispatch, DragEvent, FormEvent, SetStateAction } from "react";
import { Trash2 } from "lucide-react";
import type { StaffQueue } from "../types";
import type { ManagedUser, Role } from "../../types";
import ConfirmDialog from "../ConfirmDialog";
import "./QueueManagementPage.css";

interface QueueManagementPageProps {
  queue: StaffQueue;
  setQueue: Dispatch<SetStateAction<StaffQueue>>;
  saveQueue: () => Promise<void>;
  systemUsers: ManagedUser[];
  createSystemUser: (payload: {
    name: string;
    username: string;
    password: string;
    role: Role;
  }) => Promise<void>;
  deleteSystemUser: (id: string) => Promise<void>;
  updateSystemUser: (id: string, newRole: Role) => Promise<void>;
  resetUserPassword: (id: string, newPassword: string) => Promise<void>;
  language: "th" | "en";
}

function QueueManagementPage({
  queue,
  setQueue,
  saveQueue,
  systemUsers,
  createSystemUser,
  deleteSystemUser,
  updateSystemUser,
  resetUserPassword,
  language,
}: QueueManagementPageProps) {
  const th = language === "th";
  const [accountName, setAccountName] = useState("");
  const [accountUsername, setAccountUsername] = useState("");
  const [accountPassword, setAccountPassword] = useState("");
  const [accountRole, setAccountRole] = useState<Role>("user");

  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [resetPasswordTarget, setResetPasswordTarget] = useState<ManagedUser | null>(null);
  const [resetPasswordNew, setResetPasswordNew] = useState("");
  const [resetPasswordConfirm, setResetPasswordConfirm] = useState("");
  const [resetPasswordError, setResetPasswordError] = useState("");

  const [formName, setFormName] = useState("");
  const [formRole, setFormRole] = useState<"user" | "admin">("user");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState<"user" | "admin">("user");
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const [editingSystemUserId, setEditingSystemUserId] = useState<string | null>(null);
  const [editingSystemUserRole, setEditingSystemUserRole] = useState<Role>("user");
  const [confirmSystemUser, setConfirmSystemUser] = useState<ManagedUser | null>(null);
  const [confirmQueueUser, setConfirmQueueUser] = useState<StaffQueue[number] | null>(null);

  function handleAddUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = formName.trim();
    if (!name) {
      return;
    }

    const newUser: StaffQueue[number] = {
      id: `s-${Date.now()}`,
      name,
      role: formRole,
      isActive: true,
      status: "Available",
      currentDevice: null,
      currentTicketId: null,
      lastResponseSeconds: 0,
    };

    setQueue((prev) => [...prev, newUser]);
    setFormName("");
    setFormRole("user");
  }

  async function handleAddSystemUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const name = accountName.trim();
    const username = accountUsername.trim();
    const password = accountPassword;

    if (!name || !username || !password) {
      return;
    }

    await createSystemUser({
      name,
      username,
      password,
      role: accountRole,
    });

    setAccountName("");
    setAccountUsername("");
    setAccountPassword("");
    setAccountRole("user");
  }

  function handleDeleteSystemUser(item: ManagedUser) {
    setConfirmSystemUser(item);
  }

  function startEditSystemUser(item: ManagedUser) {
    setEditingSystemUserId(item.id);
    setEditingSystemUserRole(item.role as Role);
  }

  function cancelEditSystemUser() {
    setEditingSystemUserId(null);
  }

  function openResetPassword(item: ManagedUser) {
    setResetPasswordTarget(item);
    setResetPasswordNew("");
    setResetPasswordConfirm("");
    setResetPasswordError("");
  }

  async function handleResetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!resetPasswordTarget) return;
    if (!resetPasswordNew) {
      setResetPasswordError(th ? "กรุณากรอกรหัสผ่านใหม่" : "Please enter a new password");
      return;
    }
    if (resetPasswordNew !== resetPasswordConfirm) {
      setResetPasswordError(th ? "รหัสผ่านไม่ตรงกัน" : "Passwords do not match");
      return;
    }
    await resetUserPassword(resetPasswordTarget.id, resetPasswordNew);
    setResetPasswordTarget(null);
  }

  async function saveEditSystemUser(item: ManagedUser) {
    await updateSystemUser(item.id, editingSystemUserRole);
    setEditingSystemUserId(null);
  }

  function startEdit(item: StaffQueue[number]) {
    setEditingId(item.id);
    setEditName(item.name);
    setEditRole(item.role === "admin" ? "admin" : "user");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName("");
  }

  function saveEdit() {
    const name = editName.trim();
    if (!editingId || !name) {
      return;
    }

    setQueue((prev) =>
      prev.map((item) => {
        if (item.id !== editingId) {
          return item;
        }
        return { ...item, name, role: editRole };
      }),
    );
    cancelEdit();
  }

  function removeUser(id: string) {
    setQueue((prev) => prev.filter((item) => item.id !== id));
    if (editingId === id) {
      cancelEdit();
    }
  }

  function moveUp(index: number) {
    if (index <= 0) return;
    setQueue((prev) => {
      const clone = [...prev];
      [clone[index - 1], clone[index]] = [clone[index], clone[index - 1]];
      return clone;
    });
  }

  function moveDown(index: number) {
    if (index >= queue.length - 1) return;
    setQueue((prev) => {
      const clone = [...prev];
      [clone[index + 1], clone[index]] = [clone[index], clone[index + 1]];
      return clone;
    });
  }

  function toggleActivation(id: string) {
    setQueue((prev) =>
      prev.map((item) => {
        if (item.id !== id) {
          return item;
        }
        const nextActive = !(item.isActive !== false);
        return {
          ...item,
          isActive: nextActive,
          status: nextActive ? item.status : "Available",
          currentDevice: nextActive ? item.currentDevice : null,
          currentTicketId: nextActive ? item.currentTicketId : null,
        };
      }),
    );
  }

  function handleDragStart(id: string) {
    setDraggingId(id);
  }

  function handleDragOver(event: DragEvent<HTMLTableRowElement>, id: string) {
    event.preventDefault();
    if (id !== dragOverId) {
      setDragOverId(id);
    }
  }

  function handleDrop(targetId: string) {
    if (!draggingId || draggingId === targetId) {
      setDraggingId(null);
      setDragOverId(null);
      return;
    }

    setQueue((prev) => {
      const fromIndex = prev.findIndex((item) => item.id === draggingId);
      const toIndex = prev.findIndex((item) => item.id === targetId);

      if (fromIndex < 0 || toIndex < 0) {
        return prev;
      }

      const clone = [...prev];
      const [moved] = clone.splice(fromIndex, 1);
      clone.splice(toIndex, 0, moved);
      return clone;
    });

    setDraggingId(null);
    setDragOverId(null);
  }

  function handleDragEnd() {
    setDraggingId(null);
    setDragOverId(null);
  }

  const filteredSystemUsers = systemUsers.filter((u) => {
    const q = userSearchQuery.toLowerCase().trim();
    if (!q) return true;
    return u.name.toLowerCase().includes(q) || u.username.toLowerCase().includes(q);
  });

  return (
    <section className="queue-management-layout">
      {resetPasswordTarget && (
        <div className="reset-pw-overlay" onClick={() => setResetPasswordTarget(null)}>
          <div className="reset-pw-box" onClick={(e) => e.stopPropagation()}>
            <h3>{th ? "รีเซ็ตรหัสผ่าน" : "Reset Password"}</h3>
            <p className="muted">
              {th
                ? `ตั้งรหัสผ่านใหม่ให้ ${resetPasswordTarget.name} (${resetPasswordTarget.username})`
                : `Set new password for ${resetPasswordTarget.name} (${resetPasswordTarget.username})`}
            </p>
            <form className="reset-pw-form" onSubmit={(e) => void handleResetPassword(e)}>
              <label>
                {th ? "รหัสผ่านใหม่" : "New Password"}
                <input
                  type="password"
                  value={resetPasswordNew}
                  onChange={(e) => setResetPasswordNew(e.target.value)}
                  placeholder={th ? "กรอกรหัสผ่านใหม่" : "Enter new password"}
                  required
                />
              </label>
              <label>
                {th ? "ยืนยันรหัสผ่าน" : "Confirm Password"}
                <input
                  type="password"
                  value={resetPasswordConfirm}
                  onChange={(e) => setResetPasswordConfirm(e.target.value)}
                  placeholder={th ? "กรอกรหัสผ่านอีกครั้ง" : "Re-enter password"}
                  required
                />
              </label>
              {resetPasswordError && (
                <p className="reset-pw-error">{resetPasswordError}</p>
              )}
              <div className="reset-pw-actions">
                <button type="submit">
                  {th ? "บันทึกรหัสผ่าน" : "Save Password"}
                </button>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => setResetPasswordTarget(null)}
                >
                  {th ? "ยกเลิก" : "Cancel"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <article className="card user-access-card">
        <div className="queue-header">
          <h3>{th ? "จัดการสิทธิ์ผู้ใช้" : "User Access Management"}</h3>
        </div>
        <p className="muted">
          {th
            ? "เพิ่มบัญชีผู้ใช้ใหม่ที่สามารถเข้าสู่ระบบได้ พร้อมกำหนดสิทธิ์ User หรือ Admin"
            : "Add new system accounts that can sign in, with either User or Admin access."}
        </p>

        <form
          className="user-form"
          onSubmit={(event) => void handleAddSystemUser(event)}
        >
          <label>
            {th ? "ชื่อที่แสดง" : "Display Name"}
            <input
              value={accountName}
              onChange={(event) => setAccountName(event.target.value)}
              placeholder={th ? "เช่น sutthikan" : "e.g. sutthikan"}
              required
            />
          </label>
          <label>
            {th ? "ชื่อผู้ใช้" : "Username"}
            <input
              value={accountUsername}
              onChange={(event) => setAccountUsername(event.target.value)}
              placeholder={th ? "เช่น sutthikan" : "e.g. sutthikan"}
              required
            />
          </label>
          <label>
            {th ? "รหัสผ่าน" : "Password"}
            <input
              type="password"
              value={accountPassword}
              onChange={(event) => setAccountPassword(event.target.value)}
              placeholder={th ? "เช่น 1234" : "e.g. 1234"}
              required
            />
          </label>
          <label>
            {th ? "สิทธิ์" : "Role"}
            <select
              value={accountRole}
              onChange={(event) =>
                setAccountRole(
                  event.target.value === "admin" ? "admin" : "user",
                )
              }
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </label>
          <button type="submit">{th ? "+ เพิ่มผู้ใช้" : "+ Add User"}</button>
        </form>

        <div className="user-search-row">
          <input
            className="user-search-input"
            type="search"
            value={userSearchQuery}
            onChange={(e) => setUserSearchQuery(e.target.value)}
            placeholder={th ? "ค้นหาชื่อหรือชื่อผู้ใช้..." : "Search by name or username..."}
          />
        </div>

        <div className="table-wrap user-list-wrap">
          <table>
            <thead>
              <tr>
                <th>{th ? "ชื่อ" : "Name"}</th>
                <th>{th ? "ชื่อผู้ใช้" : "Username"}</th>
                <th>{th ? "สิทธิ์" : "Role"}</th>
                <th>{th ? "การจัดการ" : "Actions"}</th>
              </tr>
            </thead>
            <tbody>
              {filteredSystemUsers.length === 0 && (
                <tr>
                  <td colSpan={4} className="empty-cell">
                    {userSearchQuery
                      ? th ? "ไม่พบผู้ใช้ที่ค้นหา" : "No users match your search."
                      : th ? "ยังไม่มีผู้ใช้งานในระบบ" : "No system users found."}
                  </td>
                </tr>
              )}
              {filteredSystemUsers.map((item) => {
                const isSysEditing = editingSystemUserId === item.id;
                return (
                  <tr key={item.id}>
                    <td>{item.name}</td>
                    <td>{item.username}</td>
                    <td>
                      {isSysEditing ? (
                        <select
                          value={editingSystemUserRole}
                          onChange={(event) =>
                            setEditingSystemUserRole(
                              event.target.value === "admin" ? "admin" : "user",
                            )
                          }
                        >
                          <option value="user">User</option>
                          <option value="admin">Admin</option>
                        </select>
                      ) : (
                        <>
                          <span
                            className={`status-chip ${item.role === "admin" ? "warn" : "ok"}`}
                          >
                            {item.role === "admin" ? "Admin" : "User"}
                          </span>
                          {item.mustChangePassword && (
                            <span className="must-change-badge" title={th ? "ต้องเปลี่ยนรหัสผ่านเมื่อเข้าสู่ระบบ" : "Must change password on next login"}>
                              {th ? "ต้องเปลี่ยน PW" : "Must change PW"}
                            </span>
                          )}
                        </>
                      )}
                    </td>
                    <td>
                      <div className="action-cell-inner">
                        {isSysEditing ? (
                          <>
                            <button
                              type="button"
                              onClick={() => void saveEditSystemUser(item)}
                            >
                              {th ? "บันทึก" : "Save"}
                            </button>
                            <button
                              type="button"
                              className="secondary"
                              onClick={cancelEditSystemUser}
                            >
                              {th ? "ยกเลิก" : "Cancel"}
                            </button>
                            <button
                              type="button"
                              className="queue-delete-btn"
                              aria-label={`Delete ${item.username}`}
                              title={th ? `ลบ ${item.username}` : `Delete ${item.username}`}
                              onClick={() => void handleDeleteSystemUser(item)}
                            >
                              <Trash2 size={15} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => startEditSystemUser(item)}
                              aria-label={`Edit ${item.username}`}
                              title={th ? `แก้ไข ${item.username}` : `Edit ${item.username}`}
                            >
                              {th ? "แก้ไข" : "Edit"}
                            </button>
                            <button
                              type="button"
                              className="secondary"
                              onClick={() => openResetPassword(item)}
                              title={th ? `รีเซ็ตรหัสผ่าน ${item.username}` : `Reset password for ${item.username}`}
                            >
                              {th ? "รีเซ็ต รหัสผ่าน" : "Reset Password"}
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

      <article className="card queue-page full-queue-page">
        <div className="queue-header">
          <h3>{th ? "จัดลำดับคิว" : "Queue Ordering"}</h3>
          <button onClick={() => void saveQueue()}>
            {th ? "บันทึกคิว" : "Save Queue"}
          </button>
        </div>

        <p className="muted">
          {th
            ? "จัดลำดับคิวรับงานด้วยการลากวางหรือปุ่มขึ้น/ลง และเปิด/ปิดคิวรายคนได้"
            : "Use this queue block to order assignment priority. You can drag and drop rows, move rows up/down, and activate or deactivate each user."}
        </p>

        <form className="queue-form" onSubmit={handleAddUser}>
          <label>
            {th ? "ชื่อพนักงานเข้าเวร" : "On-duty Staff Name"}
            <input
              value={formName}
              onChange={(event) => setFormName(event.target.value)}
              placeholder={th ? "เช่น Sarawut" : "e.g. Sarawut"}
              required
            />
          </label>
          <label>
            {th ? "กำหนดสิทธิ์" : "Role Assignment"}
            <select
              value={formRole}
              onChange={(event) =>
                setFormRole(
                  event.target.value === "admin" ? "admin" : "user",
                )
              }
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </label>
          <button type="submit">{th ? "+ เพิ่มเข้าคิว" : "+ Add Queue"}</button>
        </form>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>{th ? "ชื่อ" : "Name"}</th>
                <th>{th ? "สิทธิ์" : "Role"}</th>
                <th>{th ? "การใช้งาน" : "Access"}</th>
                <th>{th ? "ลำดับคิว" : "Queue Ordering"}</th>
                <th>{th ? "การจัดการ" : "Actions"}</th>
              </tr>
            </thead>
            <tbody>
              {queue.length === 0 && (
                <tr>
                  <td colSpan={6} className="empty-cell">
                    {th ? "ยังไม่มีพนักงานในคิว" : "No staff in queue."}
                  </td>
                </tr>
              )}
              {queue.map((item, index) => {
                const isEditing = editingId === item.id;
                const isDragging = draggingId === item.id;
                const isDragOver = dragOverId === item.id;
                const isActive = item.isActive !== false;

                return (
                  <tr
                    key={item.id}
                    draggable
                    onDragStart={() => handleDragStart(item.id)}
                    onDragOver={(event) => handleDragOver(event, item.id)}
                    onDrop={() => handleDrop(item.id)}
                    onDragEnd={handleDragEnd}
                    className={`${isDragging ? "dragging-row" : ""} ${isDragOver ? "drag-over-row" : ""}`}
                  >
                    <td className="queue-order">#{index + 1}</td>
                    <td>
                      {isEditing ? (
                        <input
                          value={editName}
                          onChange={(event) => setEditName(event.target.value)}
                        />
                      ) : (
                        item.name
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <select
                          value={editRole}
                          onChange={(event) =>
                            setEditRole(
                              event.target.value === "admin" ? "admin" : "user",
                            )
                          }
                        >
                          <option value="user">User</option>
                          <option value="admin">Admin</option>
                        </select>
                      ) : (
                        <span
                          className={`status-chip ${item.role === "admin" ? "warn" : "ok"}`}
                        >
                          {item.role === "admin" ? "Admin" : "User"}
                        </span>
                      )}
                    </td>
                    <td>
                      <button
                        type="button"
                        className={`status-toggle ${isActive ? "active" : "inactive"}`}
                        onClick={() => toggleActivation(item.id)}
                      >
                        {isActive
                          ? th
                            ? "ปิดใช้งาน"
                            : "Deactivate"
                          : th
                            ? "เปิดใช้งาน"
                            : "Activate"}
                      </button>
                    </td>
                    <td className="queue-actions">
                      <div className="queue-actions-inner">
                        <span className="drag-hint">
                          {th ? "⠿ ลาก" : "⠿ Drag"}
                        </span>
                        <button
                          type="button"
                          onClick={() => moveUp(index)}
                          disabled={index === 0}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          onClick={() => moveDown(index)}
                          disabled={index === queue.length - 1}
                        >
                          ↓
                        </button>
                      </div>
                    </td>
                    <td className="action-cell">
                      <div className="action-cell-inner">
                        {isEditing ? (
                          <>
                            <button type="button" onClick={saveEdit}>
                              {th ? "อัปเดต" : "Update"}
                            </button>
                            <button
                              type="button"
                              className="secondary"
                              onClick={cancelEdit}
                            >
                              {th ? "ยกเลิก" : "Cancel"}
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => startEdit(item)}
                            >
                              {th ? "แก้ไข" : "Edit"}
                            </button>
                            <button
                              type="button"
                              className="queue-delete-btn"
                              aria-label={`Delete ${item.name}`}
                              title={`Delete ${item.name}`}
                              onClick={() => setConfirmQueueUser(item)}
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

      <ConfirmDialog
        open={confirmSystemUser !== null}
        title={th ? "ยืนยันการลบผู้ใช้" : "Confirm Delete User"}
        message={
          confirmSystemUser
            ? th
              ? `ต้องการลบผู้ใช้ "${confirmSystemUser.username}" ใช่หรือไม่?`
              : `Delete user "${confirmSystemUser.username}"?`
            : ""
        }
        confirmLabel={th ? "ลบ" : "Delete"}
        cancelLabel={th ? "ยกเลิก" : "Cancel"}
        onConfirm={() => {
          if (confirmSystemUser) {
            void deleteSystemUser(confirmSystemUser.id);
            if (editingSystemUserId === confirmSystemUser.id) setEditingSystemUserId(null);
          }
          setConfirmSystemUser(null);
        }}
        onCancel={() => setConfirmSystemUser(null)}
      />

      <ConfirmDialog
        open={confirmQueueUser !== null}
        title={th ? "ยืนยันการลบเข้าคิว" : "Confirm Remove from Queue"}
        message={
          confirmQueueUser
            ? th
              ? `ต้องการลบ "${confirmQueueUser.name}" ออกจากคิว ใช่หรือไม่?`
              : `Remove "${confirmQueueUser.name}" from the queue?`
            : ""
        }
        confirmLabel={th ? "ลบ" : "Remove"}
        cancelLabel={th ? "ยกเลิก" : "Cancel"}
        onConfirm={() => {
          if (confirmQueueUser) removeUser(confirmQueueUser.id);
          setConfirmQueueUser(null);
        }}
        onCancel={() => setConfirmQueueUser(null)}
      />
    </section>
  );
}

export default QueueManagementPage;
