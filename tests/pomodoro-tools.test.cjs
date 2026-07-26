const assert = require("assert");
const {
  DEFAULT_BREAK_MINUTES,
  normalizePhase,
  getValidBreakMinutes,
  getPhaseDurationSeconds,
  getNextPhase,
  shouldUseLongBreak,
  getBreakDurationMinutes
} = require("../pomodoro-tools.js");

assert.strictEqual(normalizePhase("focus"), "focus");
assert.strictEqual(normalizePhase("break"), "break");
assert.strictEqual(normalizePhase("unknown"), "focus");

assert.strictEqual(getValidBreakMinutes("1"), 1);
assert.strictEqual(getValidBreakMinutes("60"), 60);
assert.strictEqual(getValidBreakMinutes("0"), null);
assert.strictEqual(getValidBreakMinutes("61"), null);
assert.strictEqual(getValidBreakMinutes("5.5"), null);

assert.strictEqual(getPhaseDurationSeconds("focus", 25, 5), 1500);
assert.strictEqual(getPhaseDurationSeconds("break", 25, 10), 600);
assert.strictEqual(
  getPhaseDurationSeconds("break", 25, 100),
  DEFAULT_BREAK_MINUTES * 60
);

assert.strictEqual(getNextPhase("focus"), "break");
assert.strictEqual(getNextPhase("break"), "focus");
assert.strictEqual(shouldUseLongBreak(3), false);
assert.strictEqual(shouldUseLongBreak(4), true);
assert.strictEqual(getBreakDurationMinutes(false, 5, 15), 5);
assert.strictEqual(getBreakDurationMinutes(true, 5, 15), 15);
assert.strictEqual(getBreakDurationMinutes(true, 5, 100), 15);

console.log("Pomodoro tools: all tests passed");
