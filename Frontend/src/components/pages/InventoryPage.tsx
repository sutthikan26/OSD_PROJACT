import { useState } from "react";
import type { Dispatch, FormEvent, SetStateAction } from "react";
import { Trash2 } from "lucide-react";
import type { InventoryItem, Role } from "../../types";
import ConfirmDialog from "../ConfirmDialog";
import "./InventoryPage.css";

interface InventoryPageProps {
  inventory: InventoryItem[];
  editInventory: Record<string, InventoryItem>;
  setEditInventory: Dispatch<SetStateAction<Record<string, InventoryItem>>>;
  role: Role;
  saveInventory: (item: InventoryItem) => Promise<void>;
  addInventory: (payload: {
    deviceName: string;
    serialNumber: string;
    ipAddress: string;
    warrantyUntil: string;
    location: string;
  }) => Promise<void>;
  deleteInventory: (id: string) => Promise<void>;
  language: "th" | "en";
}

function InventoryPage({
  inventory,
  editInventory,
  setEditInventory,
  role,
  saveInventory,
  addInventory,
  deleteInventory,
  language,
}: InventoryPageProps) {
  const th = language === "th";
  const [searchQuery, setSearchQuery] = useState("");
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<InventoryItem | null>(null);
  const [newAsset, setNewAsset] = useState({
    deviceName: "",
    serialNumber: "",
    ipAddress: "",
    warrantyUntil: "",
    location: "",
  });

  const filteredInventory = searchQuery.trim()
    ? inventory.filter((item) => {
        const q = searchQuery.replace(/\s+/g, "").toLowerCase();
        const normalize = (s: string) => s.replace(/\s+/g, "").toLowerCase();
        return (
          normalize(item.deviceName).includes(q) ||
          normalize(item.location).includes(q) ||
          normalize(item.serialNumber).includes(q) ||
          normalize(item.ipAddress).includes(q)
        );
      })
    : inventory;

  async function submitNewAsset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await addInventory(newAsset);
    setNewAsset({
      deviceName: "",
      serialNumber: "",
      ipAddress: "",
      warrantyUntil: "",
      location: "",
    });
  }

  return (
    <section className="card inventory-page">
      <h3>{th ? "จัดการคลังอุปกรณ์" : "Inventory Management"}</h3>
      <input
        className="inventory-search"
        placeholder={th ? "ค้นหาชื่ออุปกรณ์, ตำแหน่ง, IP, หรือชั้น..." : "Search device, location, IP..."}
        value={searchQuery}
        onChange={(event) => setSearchQuery(event.target.value)}
      />
      {role === "admin" && (
        <form
          className="add-asset-form"
          onSubmit={(event) => void submitNewAsset(event)}
        >
          <input
            placeholder={th ? "ชื่ออุปกรณ์" : "Device name"}
            value={newAsset.deviceName}
            onChange={(event) =>
              setNewAsset((prev) => ({
                ...prev,
                deviceName: event.target.value,
              }))
            }
            required
          />
          <input
            placeholder={th ? "หมายเลขประจำเครื่อง" : "Serial number"}
            value={newAsset.serialNumber}
            onChange={(event) =>
              setNewAsset((prev) => ({
                ...prev,
                serialNumber: event.target.value,
              }))
            }
            required
          />
          <input
            placeholder={th ? "เลขที่อยู่ไอพี" : "IP Address"}
            value={newAsset.ipAddress}
            onChange={(event) =>
              setNewAsset((prev) => ({
                ...prev,
                ipAddress: event.target.value,
              }))
            }
          />
          <input
            placeholder={
              th ? "วันหมดประกัน (YYYY-MM-DD)" : "Warranty (YYYY-MM-DD)"
            }
            value={newAsset.warrantyUntil}
            onChange={(event) =>
              setNewAsset((prev) => ({
                ...prev,
                warrantyUntil: event.target.value,
              }))
            }
            required
          />
          <input
            placeholder={th ? "ตำแหน่งที่ตั้งอุปกรณ์" : "Location"}
            value={newAsset.location}
            onChange={(event) =>
              setNewAsset((prev) => ({ ...prev, location: event.target.value }))
            }
            required
          />
          <button type="submit">{th ? "เพิ่มอุปกรณ์" : "Add Asset"}</button>
        </form>
      )}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>{th ? "อุปกรณ์" : "Device"}</th>
              <th>{th ? "หมายเลขเครื่อง" : "Serial"}</th>
              <th>{th ? "เลขที่อยู่ไอพี" : "IP Address"}</th>
              <th>{th ? "วันหมดประกัน" : "Warranty"}</th>
              <th>{th ? "ตำแหน่งที่ตั้งอุปกรณ์" : "Location"}</th>
              {role === "admin" && <th>{th ? "การจัดการ" : "Action"}</th>}
            </tr>
          </thead>
          <tbody>
            {filteredInventory.length === 0 && (
              <tr>
                <td
                  colSpan={role === "admin" ? 6 : 5}
                  className="empty-cell"
                >
                  {searchQuery.trim()
                    ? th
                      ? "ไม่พบอุปกรณ์ที่ตรงกับคำค้นหา"
                      : "No matching assets found."
                    : th
                      ? "ยังไม่มีข้อมูลทรัพย์สิน"
                      : "No asset records available."}
                </td>
              </tr>
            )}
            {filteredInventory.map((item) => {
              const draft = editInventory[item.id] ?? item;
              const isEditing = editingItemId === item.id;
              return (
                <tr key={item.id}>
                  <td>
                    {isEditing ? (
                      <input
                        value={draft.deviceName}
                        onChange={(event) =>
                          setEditInventory((prev) => ({
                            ...prev,
                            [item.id]: { ...draft, deviceName: event.target.value },
                          }))
                        }
                      />
                    ) : (
                      item.deviceName
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <input
                        value={draft.serialNumber}
                        onChange={(event) =>
                          setEditInventory((prev) => ({
                            ...prev,
                            [item.id]: { ...draft, serialNumber: event.target.value },
                          }))
                        }
                      />
                    ) : (
                      item.serialNumber
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <input
                        value={draft.ipAddress}
                        onChange={(event) =>
                          setEditInventory((prev) => ({
                            ...prev,
                            [item.id]: { ...draft, ipAddress: event.target.value },
                          }))
                        }
                        placeholder="e.g. 192.168.1.1"
                      />
                    ) : (
                      item.ipAddress || "-"
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <input
                        value={draft.warrantyUntil}
                        onChange={(event) =>
                          setEditInventory((prev) => ({
                            ...prev,
                            [item.id]: { ...draft, warrantyUntil: event.target.value },
                          }))
                        }
                      />
                    ) : (
                      item.warrantyUntil
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <input
                        value={draft.location}
                        onChange={(event) =>
                          setEditInventory((prev) => ({
                            ...prev,
                            [item.id]: { ...draft, location: event.target.value },
                          }))
                        }
                      />
                    ) : (
                      item.location
                    )}
                  </td>
                  {role === "admin" && (
                    <td>
                      <div className="inventory-actions">
                        {isEditing ? (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                void saveInventory(draft).then(() =>
                                  setEditingItemId(null),
                                );
                              }}
                            >
                              {th ? "บันทึก" : "Save"}
                            </button>
                            <button
                              type="button"
                              className="secondary"
                              onClick={() => {
                                setEditInventory((prev) => {
                                  const clone = { ...prev };
                                  delete clone[item.id];
                                  return clone;
                                });
                                setEditingItemId(null);
                              }}
                            >
                              {th ? "ยกเลิก" : "Cancel"}
                            </button>
                            <button
                              type="button"
                              className="delete-btn"
                              aria-label={th ? `ลบ ${item.deviceName}` : `Delete ${item.deviceName}`}
                              title={th ? `ลบ ${item.deviceName}` : `Delete ${item.deviceName}`}
                              onClick={() => setConfirmTarget(item)}
                            >
                              <Trash2 size={15} />
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setEditingItemId(item.id)}
                          >
                            {th ? "แก้ไข" : "Edit"}
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={confirmTarget !== null}
        title={th ? "ยืนยันการลบ" : "Confirm Delete"}
        message={
          confirmTarget
            ? th
              ? `ต้องการลบอุปกรณ์ "${confirmTarget.deviceName}" ใช่หรือไม่?`
              : `Delete device "${confirmTarget.deviceName}"?`
            : ""
        }
        confirmLabel={th ? "ลบ" : "Delete"}
        cancelLabel={th ? "ยกเลิก" : "Cancel"}
        onConfirm={() => {
          if (confirmTarget) {
            void deleteInventory(confirmTarget.id);
            setEditingItemId(null);
          }
          setConfirmTarget(null);
        }}
        onCancel={() => setConfirmTarget(null)}
      />
    </section>
  );
}

export default InventoryPage;
