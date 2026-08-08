import assert from "assert";
import {
  DEFAULT_BREAK_MINUTES,
  DEFAULT_FOCUSES_PER_LONG_BREAK,
  normalizePhase,
  getValidBreakMinutes,
  getValidFocusesPerLongBreak,
  getPhaseDurationSeconds,
  getNextPhase,
  shouldUseLongBreak,
  getBreakDurationMinutes
} from "../src/domain/pomodoro.js";

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
assert.strictEqual(getValidFocusesPerLongBreak("2"), 2);
assert.strictEqual(getValidFocusesPerLongBreak("6"), 6);
assert.strictEqual(getValidFocusesPerLongBreak("1"), null);
assert.strictEqual(getValidFocusesPerLongBreak("7"), null);
assert.strictEqual(shouldUseLongBreak(3), false);
assert.strictEqual(shouldUseLongBreak(4), true);
assert.strictEqual(shouldUseLongBreak(2, 2), true);
assert.strictEqual(shouldUseLongBreak(4, 6), false);
assert.strictEqual(
  shouldUseLongBreak(DEFAULT_FOCUSES_PER_LONG_BREAK),
  true
);
assert.strictEqual(getBreakDurationMinutes(false, 5, 15), 5);
assert.strictEqual(getBreakDurationMinutes(true, 5, 15), 15);
assert.strictEqual(getBreakDurationMinutes(true, 5, 100), 15);

console.log("Pomodoro tools: all tests passed");
