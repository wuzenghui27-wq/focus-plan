import assert from "node:assert/strict";
import {
  BASE_RETRY_MS,
  calculateRetryDelay,
  createReminderScheduler
} from "../src/server/reminders/reminder-scheduler.js";

assert.equal(calculateRetryDelay(1), BASE_RETRY_MS);
assert.equal(calculateRetryDelay(2), BASE_RETRY_MS * 2);
assert.equal(calculateRetryDelay(20), 60 * 60 * 1000);

const now = Date.parse("2026-07-31T10:00:00.000Z");
const actions = [];
const jobs = [
  {
    endpoint: "https://push.example/success",
    planId: "success",
    notificationTitle: "计划时间到了",
    body: "成功计划",
    tag: "plan-success",
    url: "./#plans",
    reminderAt: now,
    attemptCount: 0,
    subscription: {
      endpoint: "https://push.example/success",
      keys: { p256dh: "public", auth: "auth" }
    }
  },
  {
    endpoint: "https://push.example/retry",
    planId: "retry",
    notificationTitle: "计划时间到了",
    body: "重试计划",
    tag: "plan-retry",
    url: "./#plans",
    reminderAt: now,
    attemptCount: 1,
    subscription: {
      endpoint: "https://push.example/retry",
      keys: { p256dh: "public", auth: "auth" }
    }
  },
  {
    endpoint: "https://push.example/expired",
    planId: "expired",
    notificationTitle: "计划时间到了",
    body: "失效计划",
    tag: "plan-expired",
    url: "./#plans",
    reminderAt: now,
    attemptCount: 0,
    subscription: {
      endpoint: "https://push.example/expired",
      keys: { p256dh: "public", auth: "auth" }
    }
  }
];
const store = {
  getDuePushReminderJobs: () => jobs,
  markPushReminderSent: (...args) => actions.push(["sent", ...args]),
  reschedulePushReminder: (...args) => actions.push(["retry", ...args]),
  deletePushSubscription: (...args) => actions.push(["delete", ...args])
};
const pushService = {
  isConfigured: () => true,
  sendNotification: async function (subscription) {
    if (subscription.endpoint.endsWith("/retry")) {
      throw new Error("temporary");
    }
    if (subscription.endpoint.endsWith("/expired")) {
      const error = new Error("expired");
      error.statusCode = 410;
      throw error;
    }
  }
};
const scheduler = createReminderScheduler({
  store,
  pushService,
  now: () => now,
  logger: { warn: () => {} }
});

(async function () {
  const result = await scheduler.runOnce();
  assert.deepEqual(result, { processed: 3, sent: 1, failed: 2 });
  assert.equal(actions[0][0], "sent");
  assert.equal(actions[1][0], "retry");
  assert.equal(actions[1][3], now);
  assert.equal(actions[1][4], 2);
  assert.equal(actions[1][5], now + BASE_RETRY_MS * 2);
  assert.deepEqual(actions[2], [
    "delete",
    "https://push.example/expired"
  ]);

  console.log("Reminder scheduler: all tests passed");
})().catch(function (error) {
  console.error(error);
  process.exitCode = 1;
});
