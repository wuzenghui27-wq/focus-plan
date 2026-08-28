import assert from "node:assert/strict";
import { createReminderStore } from "../src/server/data/reminder-store.js";

const store = createReminderStore(":memory:");

const pushSubscription = {
  endpoint: "https://push.example.test/device-1",
  expirationTime: null,
  keys: { p256dh: "public-key", auth: "auth-key" }
};
store.savePushSubscription(pushSubscription, "2026-07-29T00:00:00Z");
assert.deepEqual(
  store.getPushSubscription(pushSubscription.endpoint),
  pushSubscription
);

const firstReminder = {
  planId: "plan-1",
  reminderAt: "2026-07-29T00:05:00.000Z",
  notificationTitle: "计划即将到期",
  body: "阅读",
  tag: "plan-1",
  url: "./#plans"
};
store.syncPushReminderJobs(
  pushSubscription.endpoint,
  [firstReminder],
  "2026-07-29T00:00:00.000Z"
);
let reminderJobs = store.getPushReminderJobs(pushSubscription.endpoint);
assert.equal(reminderJobs.length, 1);
assert.equal(reminderJobs[0].status, "pending");
assert.equal(
  store.getDuePushReminderJobs(
    Date.parse(firstReminder.reminderAt),
    10
  ).length,
  1
);

store.markPushReminderSent(
  pushSubscription.endpoint,
  firstReminder.planId,
  Date.parse(firstReminder.reminderAt),
  "2026-07-29T00:05:01.000Z"
);
store.syncPushReminderJobs(
  pushSubscription.endpoint,
  [{ ...firstReminder, body: "阅读第二章" }],
  "2026-07-29T00:06:00.000Z"
);
reminderJobs = store.getPushReminderJobs(pushSubscription.endpoint);
assert.equal(reminderJobs[0].status, "sent");
assert.equal(reminderJobs[0].body, "阅读第二章");

const movedReminder = {
  ...firstReminder,
  reminderAt: "2026-07-29T00:15:00.000Z"
};
store.syncPushReminderJobs(
  pushSubscription.endpoint,
  [movedReminder],
  "2026-07-29T00:07:00.000Z"
);
reminderJobs = store.getPushReminderJobs(pushSubscription.endpoint);
assert.equal(reminderJobs[0].status, "pending");
assert.equal(reminderJobs[0].attemptCount, 0);
assert.equal(reminderJobs[0].sentAt, null);

store.markPushReminderSent(
  pushSubscription.endpoint,
  movedReminder.planId,
  Date.parse(firstReminder.reminderAt),
  "2026-07-29T00:08:00.000Z"
);
assert.equal(
  store.getPushReminderJobs(pushSubscription.endpoint)[0].status,
  "pending"
);

store.reschedulePushReminder(
  pushSubscription.endpoint,
  movedReminder.planId,
  Date.parse(movedReminder.reminderAt),
  1,
  Date.parse(movedReminder.reminderAt) + 30000,
  "temporary failure",
  "2026-07-29T00:15:01.000Z"
);
reminderJobs = store.getPushReminderJobs(pushSubscription.endpoint);
assert.equal(reminderJobs[0].attemptCount, 1);
assert.equal(reminderJobs[0].lastError, "temporary failure");

store.syncPushReminderJobs(
  pushSubscription.endpoint,
  [],
  "2026-07-29T00:20:00.000Z"
);
assert.equal(store.getPushReminderJobs(pushSubscription.endpoint).length, 0);

assert.equal(store.deletePushSubscription(pushSubscription.endpoint), true);
assert.equal(store.getPushSubscription(pushSubscription.endpoint), null);
assert.equal(store.deletePushSubscription(pushSubscription.endpoint), false);

store.close();
console.log("Reminder store: all tests passed");
