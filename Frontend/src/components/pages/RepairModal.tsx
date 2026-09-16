import type { RepairModalState } from "../types";
import type { Dispatch, SetStateAction } from "react";
import { BookMarked, SearchCheck, Wrench, X } from "lucide-react";
import { ROOT_CAUSE_CATEGORIES, getRootCauseLabel } from "../constants";
import "./RepairModal.css";

interface RepairModalProps {
  repairModal: RepairModalState;
  setRepairModal: Dispatch<SetStateAction<RepairModalState>>;
  analyzeRepair: () => Promise<void>;
  finishRepair: () => Promise<void>;
  onClosePending: () => void;
  language: "th" | "en";
}

const REPAIR_STEPS: Array<{
  id: 1 | 2 | 3;
  label: string;
  hint: string;
}> = [
  { id: 1, label: "Response", hint: "Accept incident and start timing" },
  { id: 2, label: "Diagnosis", hint: "Analyze root cause and fix plan" },
  { id: 3, label: "Finish", hint: "Close incident and send ACK" },
];

function RepairModal({
  repairModal,
  setRepairModal,
  analyzeRepair,
  finishRepair,
  onClosePending,
  language,
}: RepairModalProps) {
  const th = language === "th";
  if (!repairModal.open || !repairModal.alert) {
    return null;
  }

  const isDiagnosisFilled =
    repairModal.rootCause.trim().length > 0 &&
    repairModal.fixMethod.trim().length > 0;
  const isRootCauseFilled = repairModal.rootCause.trim().length > 0;

  return (
    <div className="modal-overlay repair-modal">
      <div className="modal-card">
        <button
          type="button"
          className="modal-close-icon"
          aria-label="Close repair modal"
          title={
            th ? "ปิดหน้าต่าง (ทำต่อภายหลัง)" : "Close modal (continue later)"
          }
          onClick={onClosePending}
        >
          <X size={16} />
        </button>

        <h3 className="section-title modal-title">
          <span>
            <Wrench size={16} />
          </span>
          {th ? "วิซาร์ดงานซ่อม" : "Repair Wizard"} -{" "}
          {repairModal.alert.deviceName}
        </h3>
        <p className="modal-subtitle">
          {th
            ? "ดำเนินการตามขั้นตอน Response - Diagnosis - Finish เพื่อปิดงานอย่างเป็นระบบ"
            : "Follow the Response - Diagnosis - Finish steps to close the incident in a controlled flow."}
        </p>
        <div className="stepper" role="list" aria-label="Repair progress">
          {REPAIR_STEPS.map((step, index) => {
            const status =
              repairModal.step === step.id
                ? "current"
                : repairModal.step > step.id
                  ? "done"
                  : "upcoming";

            return (
              <div key={step.id} className="stepper-fragment" role="listitem">
                <div className={`step-item ${status}`}>
                  <span className="step-index">{step.id}</span>
                  <span className="step-copy">
                    <strong>{step.label}</strong>
                    <small>{step.hint}</small>
                  </span>
                </div>
                {index < REPAIR_STEPS.length - 1 && (
                  <span
                    className={`step-line ${repairModal.step > step.id ? "filled" : ""}`}
                    aria-hidden="true"
                  />
                )}
              </div>
            );
          })}
        </div>

        {repairModal.step === 1 && (
          <div className="form-grid step-panel">
            <p>
              {th
                ? "บันทึกเวลาเริ่มงานแล้วที่"
                : "Response start time recorded"}
              : {repairModal.alert.responseStartedAt
                ? new Date(repairModal.alert.responseStartedAt).toLocaleString("th-TH", {
                    timeZone: "Asia/Bangkok",
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                    hour12: false,
                  })
                : "-"}
            </p>
            <button
              onClick={() => setRepairModal((prev) => ({ ...prev, step: 2 }))}
            >
              {th ? "ถัดไป" : "Next"}
            </button>
          </div>
        )}

        {repairModal.step === 2 && (
          <div className="wizard-grid">
            <div className="step-panel">
              <label>
                {th ? "หมวดหมู่" : "Category"}
                <select
                  value={repairModal.rootCauseCategory}
                  onChange={(event) =>
                    setRepairModal((prev) => ({
                      ...prev,
                      rootCauseCategory: event.target.value,
                      rootCause: "",
                    }))
                  }
                >
                  <option value="">
                    {th ? "-- เลือกหมวดหมู่ --" : "-- Select Category --"}
                  </option>
                  {Object.values(ROOT_CAUSE_CATEGORIES).map((category) => (
                    <option key={category.id} value={category.id}>
                      {th ? category.label_th : category.label_en}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {th ? "สาเหตุ" : "Root Cause"}
                <select
                  value={repairModal.rootCause}
                  onChange={(event) =>
                    setRepairModal((prev) => ({
                      ...prev,
                      rootCause: event.target.value,
                    }))
                  }
                  disabled={!repairModal.rootCauseCategory}
                >
                  <option value="">
                    {th ? "-- เลือกสาเหตุ --" : "-- Select Root Cause --"}
                  </option>
                  {repairModal.rootCauseCategory && 
                    ROOT_CAUSE_CATEGORIES[repairModal.rootCauseCategory as keyof typeof ROOT_CAUSE_CATEGORIES]?.items.map((item) => (
                      <option key={item.value} value={item.value}>
                        {th ? item.label_th : item.label_en}
                      </option>
                    ))}
                  {repairModal.rootCauseCategory && (
                    <option value="other">
                      {th ? "อื่นๆ" : "Other"}
                    </option>
                  )}
                  {repairModal.rootCauseCategory && (
                    <option value="unknown">
                      {th ? "ไม่ทราบ" : "Unknown"}
                    </option>
                  )}
                </select>
              </label>
              {(repairModal.rootCause === "other" ||
                repairModal.rootCause === "unknown") && (
                <label>
                  {th ? "โปรดระบุเพิ่มเติม" : "Please specify"}
                  <input
                    type="text"
                    placeholder={th ? "พิมพ์รายละเอียดเพิ่มเติม..." : "Enter additional details..."}
                    value={repairModal.rootCauseCustom}
                    onChange={(event) =>
                      setRepairModal((prev) => ({
                        ...prev,
                        rootCauseCustom: event.target.value,
                      }))
                    }
                  />
                </label>
              )}
              <label>
                {th ? "วิธีแก้ไข" : "Fix Method"}
                <textarea
                  value={repairModal.fixMethod}
                  onChange={(event) =>
                    setRepairModal((prev) => ({
                      ...prev,
                      fixMethod: event.target.value,
                    }))
                  }
                />
              </label>
              <div className="toolbar wizard-actions">
                <button
                  type="button"
                  className="secondary"
                  onClick={() =>
                    setRepairModal((prev) => ({ ...prev, step: 1 }))
                  }
                >
                  {th ? "ย้อนกลับ" : "Back"}
                </button>
                <button onClick={() => void analyzeRepair()}>
                  <SearchCheck size={15} /> Analyze
                </button>
                <button
                  onClick={() =>
                    setRepairModal((prev) => ({ ...prev, step: 3 }))
                  }
                  disabled={!isDiagnosisFilled}
                >
                  {th ? "เสร้จสิ้น" : "Finish"}
                </button>
              </div>
              {!isRootCauseFilled && (
                <p className="validation-note">
                  {th
                    ? "กรุณาเลือก หมวดหมู่ และ สาเหตุ ก่อน แล้วกด Analyze เพื่อรับคำแนะนำ"
                    : "Please select Category and Root Cause, then click Analyze for suggestions."}
                </p>
              )}
              {isRootCauseFilled && !isDiagnosisFilled && (
                <p className="validation-note">
                  {th
                    ? "กรอกวิธีแก้ไข (Fix Method) เพิ่ม เพื่อไปขั้นตอน Finish"
                    : "Add Fix Method to continue to Finish."}
                </p>
              )}
            </div>
            <div className="step-panel kb-panel">
              <h4 className="kb-title">
                <BookMarked size={16} /> Knowledge Base
              </h4>
              <ul className="list">
                {isRootCauseFilled && (
                  <li className="kb-root-cause">
                    <strong>{th ? "สาเหตุปัจจุบัน" : "Current Root Cause"}:</strong> {getRootCauseLabel(repairModal.rootCause, th ? "th" : "en")}
                    {(repairModal.rootCause === "other" ||
                      repairModal.rootCause === "unknown") &&
                      repairModal.rootCauseCustom && (
                        <div className="custom-detail">
                          ({repairModal.rootCauseCustom})
                        </div>
                      )}
                  </li>
                )}
                {repairModal.kbSuggestions.map((item) => (
                  <li key={item.id} className="kb-history-item">
                    <div className="kb-device-name">
                      <strong>{item.deviceName}</strong> <span className="kb-staff">({item.staffName})</span>
                    </div>
                    <div className="kb-details">
                      <span className="kb-label">{th ? "สาเหตุ:" : "Cause:"}</span> {getRootCauseLabel(item.rootCause, th ? "th" : "en")}
                    </div>
                    <div className="kb-details">
                      <span className="kb-label">{th ? "วิธีแก้:" : "Fix:"}</span> {item.fixMethod}
                    </div>
                  </li>
                ))}
                {repairModal.kbSuggestions.length === 0 && !isRootCauseFilled && (
                  <li>{th ? "ยังไม่มีคำแนะนำ" : "No suggestions yet"}</li>
                )}
              </ul>
            </div>
          </div>
        )}

        {repairModal.step === 3 && (
          <div className="form-grid step-panel">
            <p>
              {th
                ? "ยืนยันปิดงาน และส่ง ACK ไป Zabbix อัตโนมัติ"
                : "Confirm close and send ACK to Zabbix automatically."}
            </p>
            <div className="toolbar wizard-actions">
              <button
                type="button"
                className="secondary"
                onClick={() => setRepairModal((prev) => ({ ...prev, step: 2 }))}
              >
                {th ? "ย้อนกลับ: Diagnosis" : "Back: Diagnosis"}
              </button>
              <button
                onClick={() => void finishRepair()}
                disabled={!isDiagnosisFilled}
              >
                Finish & Send ACK
              </button>
            </div>
            {!isDiagnosisFilled && (
              <p className="validation-note">
                {th
                  ? "ยังปิดงานไม่ได้: ต้องกรอก Root Cause และวิธีแก้ไขก่อน"
                  : "Cannot close yet: Root Cause and Fix Method are required."}
              </p>
            )}
          </div>
        )}

        <p className="pending-note">
          {th
            ? "หากปิดหน้าต่างตอนนี้ จะถือว่างานยังไม่เสร็จสมบูรณ์และปัญหายังไม่ถูกปิด"
            : "If you close this modal now, the repair will remain in progress and the incident will stay open."}
        </p>
      </div>
    </div>
  );
}

export default RepairModal;
