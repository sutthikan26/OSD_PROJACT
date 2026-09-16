const express = require("express");

const { query } = require("../db");
const requireSuperAdmin = require("../middleware/requireSuperAdmin");

const router = express.Router();

router.get("/sla", requireSuperAdmin, async (req, res) => {
  try {
    const windowMultipliers = {
      7: { cases: 0.7, mttr: 0.92, acc: 1.03 },
      30: { cases: 1, mttr: 1, acc: 1 },
      90: { cases: 1.3, mttr: 1.08, acc: 0.97 },
    };

    const repairHistory = await query(
      "SELECT alert_id AS alertId, device_name AS deviceName, staff_name AS staffName, root_cause AS rootCause, fix_method AS fixMethod, mttr_minutes AS mttrMinutes, queue_missed AS queueMissed, closed_at AS closedAt FROM repair_history",
    );
    const alerts = await query(
      "SELECT status FROM alerts",
    );

    const staffStatsMap = new Map();
    repairHistory.forEach((item) => {
      const current = staffStatsMap.get(item.staffName) || {
        staffName: item.staffName,
        resolvedCases: 0,
        totalMttr: 0,
        successCount: 0,
      };

      current.resolvedCases += 1;
      current.totalMttr += item.mttrMinutes;
      if (!item.queueMissed) {
        current.successCount += 1;
      }

      staffStatsMap.set(item.staffName, current);
    });

  const staffEfficiencyRanking = Array.from(staffStatsMap.values())
    .map((item) => {
      const avgMttr =
        item.resolvedCases > 0
          ? Number((item.totalMttr / item.resolvedCases).toFixed(1))
          : 0;
      const accuracyRate =
        item.resolvedCases > 0
          ? Number(((item.successCount / item.resolvedCases) * 100).toFixed(1))
          : 0;

      return {
        staffName: item.staffName,
        resolvedCases: item.resolvedCases,
        avgMttr,
        accuracyRate,
      };
    })
    .sort((a, b) => {
      if (b.accuracyRate !== a.accuracyRate) {
        return b.accuracyRate - a.accuracyRate;
      }
      return a.avgMttr - b.avgMttr;
    });

  const staffDrilldown = Array.from(staffStatsMap.values()).map((item) => {
    const avgMttr =
      item.resolvedCases > 0
        ? Number((item.totalMttr / item.resolvedCases).toFixed(1))
        : 0;
    const accuracyRate =
      item.resolvedCases > 0
        ? Number(((item.successCount / item.resolvedCases) * 100).toFixed(1))
        : 0;

    return {
      staffName: item.staffName,
      totalResolved: item.resolvedCases,
      avgMttr,
      accuracyRate,
      cases: repairHistory
        .filter((historyItem) => historyItem.staffName === item.staffName)
        .slice(0, 5)
        .map((historyItem) => ({
          alertId: historyItem.alertId,
          deviceName: historyItem.deviceName,
          mttrMinutes: historyItem.mttrMinutes,
          queueMissed: historyItem.queueMissed,
          closedAt: historyItem.closedAt,
        })),
    };
  });

  const responseTimeTrend = [
    { label: "Mon", responseSeconds: 198 },
    { label: "Tue", responseSeconds: 186 },
    { label: "Wed", responseSeconds: 171 },
    { label: "Thu", responseSeconds: 162 },
    { label: "Fri", responseSeconds: 149 },
    { label: "Sat", responseSeconds: 155 },
    { label: "Sun", responseSeconds: 165 },
  ];

  const responseTimeTrendByWindow = {
    7: responseTimeTrend,
    30: [
      { label: "W1", responseSeconds: 201 },
      { label: "W2", responseSeconds: 188 },
      { label: "W3", responseSeconds: 176 },
      { label: "W4", responseSeconds: 163 },
    ],
    90: [
      { label: "Dec", responseSeconds: 224 },
      { label: "Jan", responseSeconds: 196 },
      { label: "Feb", responseSeconds: 165 },
    ],
  };

  const staffEfficiencyRankingByWindow = {
    7: staffEfficiencyRanking.map((item) => ({
      ...item,
      resolvedCases: Math.max(
        1,
        Math.round(item.resolvedCases * windowMultipliers[7].cases),
      ),
      avgMttr: Number((item.avgMttr * windowMultipliers[7].mttr).toFixed(1)),
      accuracyRate: Math.min(
        100,
        Number((item.accuracyRate * windowMultipliers[7].acc).toFixed(1)),
      ),
    })),
    30: staffEfficiencyRanking,
    90: staffEfficiencyRanking.map((item) => ({
      ...item,
      resolvedCases: Math.max(
        1,
        Math.round(item.resolvedCases * windowMultipliers[90].cases),
      ),
      avgMttr: Number((item.avgMttr * windowMultipliers[90].mttr).toFixed(1)),
      accuracyRate: Math.min(
        100,
        Number((item.accuracyRate * windowMultipliers[90].acc).toFixed(1)),
      ),
    })),
  };

  const completedCases = repairHistory.length;
  const targetMinutes = 30;
  const withinTarget = repairHistory.filter(
    (item) => item.mttrMinutes <= targetMinutes,
  ).length;
  const complianceRate =
    completedCases > 0
      ? Number(((withinTarget / completedCases) * 100).toFixed(1))
      : 0;

    res.json({
      monthlyTrend: [
        { month: "Oct", mttr: 31, queueMissRate: 8 },
        { month: "Nov", mttr: 29, queueMissRate: 6 },
        { month: "Dec", mttr: 24, queueMissRate: 4 },
        { month: "Jan", mttr: 21, queueMissRate: 3 },
        { month: "Feb", mttr: 19, queueMissRate: 2 },
      ],
      summary: {
        avgMttr: 24,
        queueMissRate: 4.6,
        totalIncidents:
          repairHistory.length +
          alerts.filter((a) => a.status !== "Closed").length,
      },
      staffEfficiencyRanking,
      responseTimeTrend,
      responseTimeTrendByWindow,
      staffEfficiencyRankingByWindow,
      staffDrilldown,
      slaCompliance: {
        targetMinutes,
        completedCases,
        withinTarget,
        ratePercent: complianceRate,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Database error" });
  }
});

module.exports = router;
