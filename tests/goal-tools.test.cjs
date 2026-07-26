const assert = require("assert");
const {
  DAILY_GOAL_STORAGE_KEY,
  DEFAULT_DAILY_GOAL_MINUTES,
  getValidDailyGoalMinutes,
  loadDailyGoal,
  saveDailyGoal,
  calculateDailyGoalProgress,
  calculateDailyGoalStreak
} = require("../goal-tools.js");

assert.strictEqual(getValidDailyGoalMinutes("15"), 15);
assert.strictEqual(getValidDailyGoalMinutes("720"), 720);
assert.strictEqual(getValidDailyGoalMinutes("14"), null);
assert.strictEqual(getValidDailyGoalMinutes("721"), null);
assert.strictEqual(getValidDailyGoalMinutes("30.5"), null);

const values = new Map([[DAILY_GOAL_STORAGE_KEY, "90"]]);
const storage = {
  getItem: function (key) {
    return values.has(key) ? values.get(key) : null;
  },
  setItem: function (key, value) {
    values.set(key, value);
  }
};

assert.strictEqual(loadDailyGoal(storage), 90);
assert.strictEqual(saveDailyGoal(storage, 120).ok, true);
assert.strictEqual(values.get(DAILY_GOAL_STORAGE_KEY), "120");
assert.strictEqual(saveDailyGoal(storage, 10).ok, false);
assert.strictEqual(
  loadDailyGoal({
    getItem: function () {
      throw new Error("Storage unavailable.");
    }
  }),
  DEFAULT_DAILY_GOAL_MINUTES
);

function session(id, year, month, day, seconds) {
  return {
    id: id,
    completedAt: new Date(year, month, day, 12).toISOString(),
    actualSeconds: seconds
  };
}

const reference = new Date(2026, 6, 26, 18);
const sessions = [
  session(1, 2026, 6, 24, 3600),
  session(2, 2026, 6, 25, 1800),
  session(3, 2026, 6, 25, 1800),
  session(4, 2026, 6, 26, 1800),
  {
    id: 5,
    completedAt: new Date(2026, 6, 26, 14).toISOString(),
    actualSeconds: -10
  }
];

assert.deepStrictEqual(
  calculateDailyGoalProgress(sessions, 60, reference),
  {
    goalMinutes: 60,
    todaySeconds: 1800,
    percentage: 50,
    reached: false
  }
);
assert.strictEqual(
  calculateDailyGoalStreak(sessions, 60, reference),
  2
);

const reachedTodaySessions = sessions.concat(
  session(6, 2026, 6, 26, 3600)
);
assert.strictEqual(
  calculateDailyGoalProgress(reachedTodaySessions, 60, reference).percentage,
  100
);
assert.strictEqual(
  calculateDailyGoalStreak(reachedTodaySessions, 60, reference),
  3
);

console.log("Goal tools: all tests passed");
