const assert = require("assert");
const {
  achievements,
  calculateLongestFocusStreak
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

const completeAchievementSet = [
  createSession("2026-07-18T00:00:00.000Z", 60 * 60),
  createSession("2026-07-19T00:00:00.000Z", 10 * 60),
  createSession("2026-07-20T00:00:00.000Z", 10 * 60),
  createSession("2026-07-20T01:00:00.000Z", 10 * 60),
  createSession("2026-07-20T02:00:00.000Z", 10 * 60)
];

assert.strictEqual(calculateLongestFocusStreak(completeAchievementSet), 3);
assert.deepStrictEqual(
  getUnlockedIds(completeAchievementSet),
  [
    "first-focus",
    "total-hour",
    "five-sessions",
    "deep-focus",
    "three-day-streak"
  ]
);

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

console.log("Achievement rules: all tests passed");
