import assert from "assert";
import {
  getValidMinutes,
  formatTimer,
  calculateRemainingSeconds
} from "../src/domain/timer.js";

assert.strictEqual(getValidMinutes("1", 1, 180), 1);
assert.strictEqual(getValidMinutes("180", 1, 180), 180);
assert.strictEqual(getValidMinutes("0", 1, 180), null);
assert.strictEqual(getValidMinutes("181", 1, 180), null);
assert.strictEqual(getValidMinutes("25.5", 1, 180), null);
assert.strictEqual(getValidMinutes("abc", 1, 180), null);

assert.strictEqual(formatTimer(0), "00:00");
assert.strictEqual(formatTimer(5), "00:05");
assert.strictEqual(formatTimer(1500), "25:00");
assert.strictEqual(formatTimer(-10), "00:00");

const now = 100000;
assert.strictEqual(calculateRemainingSeconds(now + 25000, now), 25);
assert.strictEqual(calculateRemainingSeconds(now + 24501, now), 25);
assert.strictEqual(calculateRemainingSeconds(now - 1000, now), 0);
assert.strictEqual(calculateRemainingSeconds("invalid", now), 0);

console.log("Timer tools: all tests passed");
