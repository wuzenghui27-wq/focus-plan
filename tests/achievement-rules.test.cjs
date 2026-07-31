const assert = require("assert");
const {
  achievements,
  achievementCategories,
  calculateLongestFocusStreak,
  calculateAchievementMetrics,
  getAchievementProgress
} = require("../achievement-rules.js");

function createSession(completedAt, actualSeconds) {
  return { completedAt, actualSeconds };
}

function getUnlockedIds(sessions) {
  return achievements
    .filter(function (achievement) {
      return achievement.isUnlocked(sessions);
    })
    .map(function (achievement) {
      return achievement.id;
    });
}

assert.deepStrictEqual(getUnlockedIds([]), []);

const firstSession = [
  createSession("2026-07-20T00:00:00.000Z", 25 * 60)
];
assert.deepStrictEqual(getUnlockedIds(firstSession), ["first-focus"]);

const sampleSessions = [
  createSession("2026-07-18T00:00:00.000Z", 60 * 60),
  createSession("2026-07-19T00:00:00.000Z", 10 * 60),
  createSession("2026-07-20T00:00:00.000Z", 10 * 60),
  createSession("2026-07-20T01:00:00.000Z", 10 * 60),
  createSession("2026-07-20T02:00:00.000Z", 10 * 60)
];

assert.strictEqual(achievementCategories.length, 4);
assert.strictEqual(achievements.length, 12);
assert.strictEqual(calculateLongestFocusStreak(sampleSessions), 3);
assert.deepStrictEqual(
  getUnlockedIds(sampleSessions),
  [
    "first-focus",
    "total-hour",
    "three-day-streak",
    "deep-forty-five",
    "deep-focus"
  ]
);

const metrics = calculateAchievementMetrics(sampleSessions);
assert.deepStrictEqual(metrics, {
  sessionCount: 5,
  totalSeconds: 6000,
  longestStreak: 3,
  longestSessionSeconds: 3600
});

const tenSessions = achievements.find(function (achievement) {
  return achievement.id === "ten-sessions";
});
assert.deepStrictEqual(getAchievementProgress(tenSessions, metrics), {
  currentValue: 5,
  targetValue: 10,
  progress: 0.5,
  percentage: 50,
  isUnlocked: false
});
assert.deepStrictEqual(tenSessions.legacyIds, ["five-sessions"]);

const nonConsecutiveSessions = [
  createSession("2026-07-18T00:00:00.000Z", 20 * 60),
  createSession("2026-07-20T00:00:00.000Z", 20 * 60),
  createSession("2026-07-22T00:00:00.000Z", 20 * 60)
];

assert.strictEqual(calculateLongestFocusStreak(nonConsecutiveSessions), 1);
assert.strictEqual(
  getUnlockedIds(nonConsecutiveSessions).includes("three-day-streak"),
  false
);

assert.deepStrictEqual(calculateAchievementMetrics([
  null,
  createSession("invalid", 0),
  createSession("2026-07-22T00:00:00.000Z", Number.NaN)
]), {
  sessionCount: 0,
  totalSeconds: 0,
  longestStreak: 0,
  longestSessionSeconds: 0
});

console.log("Achievement rules: all tests passed");
