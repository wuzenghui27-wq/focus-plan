const assert = require("assert");
const {
  normalizeRepeat,
  calculateNextDueAt,
  createNextOccurrence
} = require("../recurrence-tools.js");

assert.strictEqual(normalizeRepeat("daily"), "daily");
assert.strictEqual(normalizeRepeat("weekly"), "weekly");
assert.strictEqual(normalizeRepeat("monthly"), "none");

assert.strictEqual(
  calculateNextDueAt("2026-07-31T09:30", "daily"),
  "2026-08-01T09:30"
);
assert.strictEqual(
  calculateNextDueAt("2026-12-28T18:45", "weekly"),
  "2027-01-04T18:45"
);
assert.strictEqual(
  calculateNextDueAt("2026-07-31T09:30", "none"),
  ""
);
assert.strictEqual(calculateNextDueAt("invalid", "daily"), "");

const sourcePlan = {
  id: 10,
  title: "每日阅读",
  tag: "阅读",
  notes: "阅读三十分钟",
  subtasks: [
    { id: 20, text: "阅读第一章", completed: true }
  ],
  priority: "high",
  dueAt: "2026-07-31T09:30",
  repeat: "daily",
  reminderMinutes: 15,
  reminded: true,
  completed: true,
  nextOccurrenceCreated: true
};
const nextPlan = createNextOccurrence(sourcePlan, 11);

assert.deepStrictEqual(nextPlan, {
  id: 11,
  title: "每日阅读",
  tag: "阅读",
  notes: "阅读三十分钟",
  subtasks: [
    { id: 20, text: "阅读第一章", completed: false }
  ],
  priority: "high",
  dueAt: "2026-08-01T09:30",
  repeat: "daily",
  reminderMinutes: 15,
  reminded: false,
  snoozedUntil: null,
  completed: false,
  nextOccurrenceCreated: false,
  generatedFromId: 10
});
assert.strictEqual(createNextOccurrence({
  id: 1,
  dueAt: "",
  repeat: "daily"
}, 2), null);

console.log("Recurrence tools: all tests passed");
