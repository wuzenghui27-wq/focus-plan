import assert from "assert";
import {
  normalizeReminderMinutes,
  calculateReminderAt,
  normalizeSnoozedUntil,
  calculateSnoozedUntil,
  getPlanReminderAt,
  isPlanReminderDue
} from "../src/domain/reminders.js";

assert.strictEqual(normalizeReminderMinutes("15"), 15);
assert.strictEqual(normalizeReminderMinutes(60), 60);
assert.strictEqual(normalizeReminderMinutes(10), 0);
assert.strictEqual(normalizeReminderMinutes("invalid"), 0);

const dueAt = "2026-07-26T10:00";
const dueTime = new Date(dueAt).getTime();

assert.strictEqual(
  calculateReminderAt(dueAt, 15),
  dueTime - 15 * 60 * 1000
);
assert.strictEqual(calculateReminderAt("invalid", 15), null);

const snoozeStart = Date.parse("2026-07-26T09:30:00.000Z");
const snoozedUntil = "2026-07-26T09:45:00.000Z";

assert.strictEqual(normalizeSnoozedUntil(snoozedUntil), snoozedUntil);
assert.strictEqual(normalizeSnoozedUntil("invalid"), null);
assert.strictEqual(normalizeSnoozedUntil(null), null);
assert.strictEqual(
  calculateSnoozedUntil(snoozeStart, 15),
  snoozedUntil
);
assert.strictEqual(calculateSnoozedUntil(snoozeStart, 10), null);
assert.strictEqual(calculateSnoozedUntil("invalid", 15), null);

const plan = {
  dueAt: dueAt,
  reminderMinutes: 15,
  completed: false,
  reminded: false
};

assert.strictEqual(
  isPlanReminderDue(plan, dueTime - 16 * 60 * 1000),
  false
);
assert.strictEqual(
  isPlanReminderDue(plan, dueTime - 15 * 60 * 1000),
  true
);
assert.strictEqual(
  isPlanReminderDue(plan, dueTime),
  true
);
assert.strictEqual(
  isPlanReminderDue(Object.assign({}, plan, { completed: true }), dueTime),
  false
);
assert.strictEqual(
  isPlanReminderDue(Object.assign({}, plan, { reminded: true }), dueTime),
  false
);
assert.strictEqual(
  isPlanReminderDue(Object.assign({}, plan, { dueAt: "" }), dueTime),
  false
);

const snoozedPlan = Object.assign({}, plan, {
  snoozedUntil: snoozedUntil
});
assert.strictEqual(getPlanReminderAt(snoozedPlan), Date.parse(snoozedUntil));
assert.strictEqual(
  isPlanReminderDue(snoozedPlan, Date.parse(snoozedUntil) - 1),
  false
);
assert.strictEqual(
  isPlanReminderDue(snoozedPlan, Date.parse(snoozedUntil)),
  true
);

console.log("Reminder tools: all tests passed");
