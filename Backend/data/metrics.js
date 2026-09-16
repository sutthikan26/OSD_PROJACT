const incidentAnalysis = [
  { cause: "Configuration", count: 17 },
  { cause: "Hardware Failure", count: 13 },
  { cause: "ISP", count: 10 },
  { cause: "Power", count: 7 },
  { cause: "Human Error", count: 5 },
];

const mttrTrendDaily = [
  { day: "Mon", mttrMinutes: 34 },
  { day: "Tue", mttrMinutes: 29 },
  { day: "Wed", mttrMinutes: 25 },
  { day: "Thu", mttrMinutes: 22 },
  { day: "Fri", mttrMinutes: 20 },
  { day: "Sat", mttrMinutes: 18 },
  { day: "Sun", mttrMinutes: 21 },
];

module.exports = {
  incidentAnalysis,
  mttrTrendDaily,
};
