const assert = require("node:assert/strict");
const PushReminderTools = require("../push-reminder-tools.js");

const plans = [
  {
    id: 1,
    title: "提前提醒计划",
    dueAt: "2026-07-31T10:00:00.000Z",
    reminderMinutes: 15,
    snoozedUntil: null,
    completed: false,
    reminded: false
  },
  {
    id: 2,
    title: "稍后提醒计划",
    dueAt: "2026-07-31T10:00:00.000Z",
    reminderMinutes: 0,
    snoozedUntil: "2026-07-31T10:20:00.000Z",
    completed: false,
    reminded: false
  },
  {
    id: 3,
    title: "已经提醒",
    dueAt: "2026-07-31T10:00:00.000Z",
    reminderMinutes: 0,
    reminded: true,
    completed: false
  },
  {
    id: 4,
    title: "已经完成",
    dueAt: "2026-07-31T10:00:00.000Z",
    reminderMinutes: 0,
    reminded: false,
    completed: true
  }
];

assert.equal(
  PushReminderTools.getPlanReminderTime(plans[0]),
  Date.parse("2026-07-31T09:45:00.000Z")
);
assert.equal(
  PushReminderTools.getPlanReminderTime(plans[1]),
  Date.parse("2026-07-31T10:20:00.000Z")
);

const jobs = PushReminderTools.createReminderJobs(plans);
assert.equal(jobs.length, 2);
assert.equal(jobs[0].notificationTitle, "计划即将到期");
assert.equal(jobs[1].notificationTitle, "稍后提醒时间到了");
assert.equal(jobs[1].reminderAt, "2026-07-31T10:20:00.000Z");

assert.deepEqual(
  PushReminderTools.normalizeReminderJobs(jobs),
  jobs
);
assert.throws(
  () => PushReminderTools.normalizeReminderJobs([
    { ...jobs[0], url: "https://unsafe.example" }
  ]),
  /格式无效/
);

console.log("Push reminder tools: all tests passed");
