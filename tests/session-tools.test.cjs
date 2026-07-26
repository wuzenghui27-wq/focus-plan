const assert = require("assert");
const {
  isSameLocalDate,
  getStartOfCurrentWeek,
  getSessionPlanKey,
  filterFocusSessions,
  calculateFocusStatistics,
  getLocalDateKey,
  calculateDailyFocusTrend,
  calculateWeeklyComparison
} = require("../session-tools.js");

function createSession(id, completedDate, planId, actualSeconds) {
  return {
    id,
    planId,
    planTitle: planId === null ? "自由专注" : "计划 " + planId,
    plannedMinutes: actualSeconds / 60,
    actualSeconds,
    completedAt: completedDate.toISOString()
  };
}

const referenceDate = new Date(2026, 6, 22, 12, 0, 0);
const mondaySession = createSession(1, new Date(2026, 6, 20, 9), 2, 1200);
const todaySession = createSession(2, new Date(2026, 6, 22, 9), 1, 1500);
const previousSundaySession = createSession(3, new Date(2026, 6, 19, 9), 1, 1800);
const futureSession = createSession(4, new Date(2026, 6, 23, 9), null, 600);
const sessions = [
  mondaySession,
  todaySession,
  previousSundaySession,
  futureSession
];

assert.strictEqual(
  isSameLocalDate(todaySession.completedAt, referenceDate),
  true
);
assert.strictEqual(
  isSameLocalDate(previousSundaySession.completedAt, referenceDate),
  false
);

const startOfWeek = getStartOfCurrentWeek(referenceDate);
assert.strictEqual(startOfWeek.getDay(), 1);
assert.strictEqual(startOfWeek.getDate(), 20);
assert.strictEqual(startOfWeek.getHours(), 0);

assert.deepStrictEqual(
  filterFocusSessions(
    sessions,
    { period: "today", planKey: "" },
    referenceDate
  ).map(function (session) { return session.id; }),
  [2]
);

assert.deepStrictEqual(
  filterFocusSessions(
    sessions,
    { period: "week", planKey: "" },
    referenceDate
  ).map(function (session) { return session.id; }),
  [1, 2]
);

assert.deepStrictEqual(
  filterFocusSessions(
    sessions,
    { period: "week", planKey: "plan:1" },
    referenceDate
  ).map(function (session) { return session.id; }),
  [2]
);

assert.strictEqual(getSessionPlanKey(futureSession), "free");
assert.strictEqual(getSessionPlanKey(todaySession), "plan:1");

const daylightReference = new Date(2026, 3, 6, 12);
const daylightWeekStart = getStartOfCurrentWeek(daylightReference);
assert.strictEqual(daylightWeekStart.getDay(), 1);
assert.strictEqual(daylightWeekStart.getDate(), 6);
assert.strictEqual(daylightWeekStart.getHours(), 0);

const statisticsSessions = [
  createSession(10, new Date(2026, 6, 22, 8), 1, 600),
  createSession(11, new Date(2026, 6, 22, 10), 2, 900),
  createSession(12, new Date(2026, 6, 21, 10), 2, 3600)
];
const statistics = calculateFocusStatistics(statisticsSessions, referenceDate);

assert.deepStrictEqual(statistics, {
  todaySeconds: 1500,
  todayCount: 2,
  totalSeconds: 5100,
  longestSeconds: 3600
});

assert.strictEqual(
  getLocalDateKey(new Date(2026, 6, 5, 12)),
  "2026-07-05"
);
assert.strictEqual(getLocalDateKey("invalid"), "");

const trendReference = new Date(2026, 7, 2, 12);
const trendSessions = [
  createSession(20, new Date(2026, 6, 27, 9), 1, 600),
  createSession(21, new Date(2026, 7, 1, 9), 1, 900),
  createSession(22, new Date(2026, 7, 1, 15), 2, 600),
  createSession(23, new Date(2026, 6, 26, 9), 2, 3600),
  createSession(24, new Date(2026, 7, 3, 9), 2, 3600)
];
trendSessions.push({
  id: 25,
  completedAt: new Date(2026, 7, 2, 9).toISOString(),
  actualSeconds: -20
});

const trend = calculateDailyFocusTrend(
  trendSessions,
  trendReference,
  7
);

assert.strictEqual(trend.length, 7);
assert.strictEqual(trend[0].dateKey, "2026-07-27");
assert.strictEqual(trend[6].dateKey, "2026-08-02");
assert.strictEqual(trend[0].totalSeconds, 600);
assert.strictEqual(trend[5].totalSeconds, 1500);
assert.strictEqual(trend[6].totalSeconds, 0);

const weeklyReference = new Date(2026, 6, 29, 18);
const weeklySessions = [
  createSession(30, new Date(2026, 6, 27, 9), 1, 3600),
  createSession(31, new Date(2026, 6, 28, 9), 1, 1800),
  createSession(32, new Date(2026, 6, 20, 9), 2, 1800),
  createSession(33, new Date(2026, 6, 26, 9), 2, 1800),
  createSession(34, new Date(2026, 6, 19, 9), 2, 7200),
  createSession(35, new Date(2026, 6, 30, 9), 2, 7200)
];
weeklySessions.push({
  id: 36,
  completedAt: new Date(2026, 6, 28, 14).toISOString(),
  actualSeconds: -100
});

assert.deepStrictEqual(
  calculateWeeklyComparison(weeklySessions, weeklyReference),
  {
    currentWeekSeconds: 5400,
    previousWeekSeconds: 3600,
    changePercentage: 50
  }
);

assert.deepStrictEqual(
  calculateWeeklyComparison(
    [createSession(40, new Date(2026, 6, 28, 9), 1, 1200)],
    weeklyReference
  ),
  {
    currentWeekSeconds: 1200,
    previousWeekSeconds: 0,
    changePercentage: null
  }
);

console.log("Session tools: all tests passed");
