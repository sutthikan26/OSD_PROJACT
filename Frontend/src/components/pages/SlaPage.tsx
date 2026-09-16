import { useEffect, useMemo, useState } from "react";
import type { SlaData } from "../types";
import "./SlaPage.css";

interface SlaPageProps {
  sla: SlaData;
  language: "th" | "en";
}

function SlaPage({ sla, language }: SlaPageProps) {
  const th = language === "th";
  const [windowDays, setWindowDays] = useState<"7" | "30" | "90">("30");

  const ranking =
    sla.staffEfficiencyRankingByWindow?.[windowDays] ??
    sla.staffEfficiencyRanking;
  const responseTrend =
    sla.responseTimeTrendByWindow?.[windowDays] ?? sla.responseTimeTrend;

  const [selectedStaffName, setSelectedStaffName] = useState<string>(
    ranking[0]?.staffName ?? "",
  );

  useEffect(() => {
    if (!ranking.some((item) => item.staffName === selectedStaffName)) {
      setSelectedStaffName(ranking[0]?.staffName ?? "");
    }
  }, [ranking, selectedStaffName]);

  const selectedStaffDetail = useMemo(
    () =>
      sla.staffDrilldown?.find(
        (item) => item.staffName === selectedStaffName,
      ) ?? null,
    [selectedStaffName, sla.staffDrilldown],
  );

  const maxMttr = Math.max(...sla.monthlyTrend.map((item) => item.mttr), 1);
  const maxResponse = Math.max(
    ...responseTrend.map((item) => item.responseSeconds),
    1,
  );

  return (
    <section className="sla-page">
      <article className="card sla-summary-card">
        <h3>{th ? "สรุปภาพรวม" : "Summary"}</h3>
        <div className="sla-kpi-grid">
          <div className="sla-kpi-item">
            <span>{th ? "MTTR เฉลี่ย" : "Average MTTR"}</span>
            <strong>
              {sla.summary.avgMttr} {th ? "นาที" : "min"}
            </strong>
          </div>
          <div className="sla-kpi-item">
            <span>{th ? "อัตราพลาดคิว" : "Queue Miss Rate"}</span>
            <strong>{sla.summary.queueMissRate}%</strong>
          </div>
          <div className="sla-kpi-item">
            <span>{th ? "จำนวน Incident ทั้งหมด" : "Total Incidents"}</span>
            <strong>{sla.summary.totalIncidents}</strong>
          </div>
          <div className="sla-kpi-item compliance">
            <span>{th ? "อัตราปฏิบัติตาม SLA" : "SLA Compliance Rate"}</span>
            <strong>{sla.slaCompliance.ratePercent}%</strong>
            <small>
              {sla.slaCompliance.withinTarget}/
              {sla.slaCompliance.completedCases}{" "}
              {th ? "เหตุการณ์" : "incidents"} {th ? "ภายใน" : "within"}{" "}
              {sla.slaCompliance.targetMinutes} {th ? "นาที" : "min"}
            </small>
          </div>
        </div>
      </article>

      <section className="grid-2 sla-middle-grid">
        <article className="card">
          <h3>{th ? "แนวโน้มรายเดือน" : "Monthly Trend"}</h3>
          {sla.monthlyTrend.map((item) => (
            <div key={item.month} className="bar-row">
              <span>{item.month}</span>
              <div className="bar-track">
                <div
                  className="bar-fill"
                  style={{
                    width: `${Math.max(8, (item.mttr / maxMttr) * 100)}%`,
                  }}
                />
              </div>
              <span>
                {th ? "MTTR" : "MTTR"} {item.mttr}
              </span>
            </div>
          ))}
        </article>

        <article className="card">
          <div className="sla-card-head">
            <h3>{th ? "แนวโน้มเวลาตอบสนอง" : "Response Time Trend"}</h3>
            <div
              className="window-switch"
              role="group"
              aria-label="Window filter"
            >
              <button
                type="button"
                className={windowDays === "7" ? "active" : ""}
                onClick={() => setWindowDays("7")}
              >
                7D
              </button>
              <button
                type="button"
                className={windowDays === "30" ? "active" : ""}
                onClick={() => setWindowDays("30")}
              >
                30D
              </button>
              <button
                type="button"
                className={windowDays === "90" ? "active" : ""}
                onClick={() => setWindowDays("90")}
              >
                90D
              </button>
            </div>
          </div>
          {responseTrend.map((item) => (
            <div key={item.label} className="bar-row response-row">
              <span>{item.label}</span>
              <div className="bar-track">
                <div
                  className="bar-fill response-fill"
                  style={{
                    width: `${Math.max(8, (item.responseSeconds / maxResponse) * 100)}%`,
                  }}
                />
              </div>
              <span>{item.responseSeconds}s</span>
            </div>
          ))}
        </article>
      </section>

      <section className="grid-2 sla-ranking-layout">
        <article className="card sla-ranking-card">
          <h3>
            {th ? "อันดับประสิทธิภาพพนักงาน" : "Staff Efficiency Ranking"}
          </h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{th ? "อันดับ" : "Rank"}</th>
                  <th>{th ? "พนักงาน" : "Staff"}</th>
                  <th>{th ? "จำนวนที่แก้ไข" : "Resolved Cases"}</th>
                  <th>{th ? "MTTR เฉลี่ย (นาที)" : "Avg MTTR (min)"}</th>
                  <th>{th ? "ความแม่นยำ" : "Accuracy"}</th>
                </tr>
              </thead>
              <tbody>
                {ranking.length === 0 && (
                  <tr>
                    <td colSpan={5} className="empty-cell">
                      {th
                        ? "ยังไม่มีข้อมูลประสิทธิภาพพนักงาน"
                        : "No staff efficiency data yet."}
                    </td>
                  </tr>
                )}
                {ranking.map((item, index) => (
                  <tr
                    key={item.staffName}
                    className={
                      selectedStaffName === item.staffName ? "selected-row" : ""
                    }
                    onClick={() => setSelectedStaffName(item.staffName)}
                  >
                    <td>#{index + 1}</td>
                    <td>{item.staffName}</td>
                    <td>{item.resolvedCases}</td>
                    <td>{item.avgMttr}</td>
                    <td>
                      <span className="status-chip ok">
                        {item.accuracyRate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="card sla-drilldown-card">
          <h3>{th ? "รายละเอียดรายพนักงาน" : "Staff Drill-down"}</h3>
          {!selectedStaffDetail && (
            <p className="muted">
              {th
                ? "เลือกพนักงานจากตารางอันดับเพื่อดูรายละเอียด"
                : "Select a staff member from the ranking table to view details."}
            </p>
          )}
          {selectedStaffDetail && (
            <>
              <div className="sla-drilldown-kpis">
                <p>
                  <strong>{selectedStaffDetail.staffName}</strong>
                </p>
                <p>
                  {th ? "จำนวนที่แก้ไข" : "Resolved"}:{" "}
                  {selectedStaffDetail.totalResolved}
                </p>
                <p>
                  {th ? "MTTR เฉลี่ย" : "Avg MTTR"}:{" "}
                  {selectedStaffDetail.avgMttr} {th ? "นาที" : "min"}
                </p>
                <p>
                  {th ? "ความแม่นยำ" : "Accuracy"}:{" "}
                  {selectedStaffDetail.accuracyRate}%
                </p>
              </div>

              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>{th ? "แจ้งเตือน" : "Alert"}</th>
                      <th>{th ? "อุปกรณ์" : "Device"}</th>
                      <th>MTTR</th>
                      <th>{th ? "เวลาปิด" : "Closed"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedStaffDetail.cases.length === 0 && (
                      <tr>
                        <td colSpan={4} className="empty-cell">
                          {th
                            ? "ยังไม่มีเหตุการณ์ย้อนหลัง"
                            : "No historical incidents yet."}
                        </td>
                      </tr>
                    )}
                    {selectedStaffDetail.cases.map((caseItem) => (
                      <tr key={`${caseItem.alertId}-${caseItem.closedAt}`}>
                        <td>{caseItem.alertId}</td>
                        <td>{caseItem.deviceName}</td>
                        <td>
                          {caseItem.mttrMinutes} {th ? "นาที" : "min"}
                        </td>
                        <td>
                          {new Date(caseItem.closedAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </article>
      </section>

      <article className="card sla-compliance-card">
        <h3>{th ? "อัตราการปฏิบัติตาม SLA" : "SLA Compliance Rate"}</h3>
        <div className="sla-compliance-layout">
          <div className="sla-compliance-progress">
            <div className="bar-track compliance-track">
              <div
                className="bar-fill compliance-fill"
                style={{
                  width: `${Math.min(100, sla.slaCompliance.ratePercent)}%`,
                }}
              />
            </div>
            <p className="muted">
              {th
                ? "อัตราเหตุการณ์ที่ปิดได้ภายใน SLA เป้าหมาย"
                : "Rate of incidents closed within the SLA target"}
            </p>
          </div>
          <div className="sla-compliance-stats">
            <p>
              <strong>{th ? "เป้าหมาย" : "Target"}:</strong> ≤{" "}
              {sla.slaCompliance.targetMinutes} {th ? "นาที" : "min"}
            </p>
            <p>
              <strong>{th ? "ภายในเป้าหมาย" : "Within Target"}:</strong>{" "}
              {sla.slaCompliance.withinTarget}
            </p>
            <p>
              <strong>{th ? "ปิดทั้งหมด" : "Total Completed"}:</strong>{" "}
              {sla.slaCompliance.completedCases}
            </p>
          </div>
        </div>
      </article>
    </section>
  );
}

export default SlaPage;
