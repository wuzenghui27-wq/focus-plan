const BASE_RETRY_MS = 30 * 1000;
const MAX_RETRY_MS = 60 * 60 * 1000;
const DEFAULT_BATCH_SIZE = 50;

function calculateRetryDelay(attemptCount) {
  const exponent = Math.max(0, Number(attemptCount) - 1);
  return Math.min(BASE_RETRY_MS * 2 ** exponent, MAX_RETRY_MS);
}

function createReminderScheduler(options) {
  const store = options.store;
  const pushService = options.pushService;
  const intervalMs = options.intervalMs || 15 * 1000;
  const batchSize = options.batchSize || DEFAULT_BATCH_SIZE;
  const now = options.now || Date.now;
  const logger = options.logger || console;
  let timer = null;
  let running = false;

  async function runOnce() {
    if (running || !pushService.isConfigured()) {
      return { processed: 0, sent: 0, failed: 0 };
    }

    running = true;
    let sent = 0;
    let failed = 0;

    try {
      const jobs = store.getDuePushReminderJobs(now(), batchSize);

      for (const job of jobs) {
        try {
          await pushService.sendNotification(job.subscription, {
            title: job.notificationTitle,
            body: job.body,
            tag: job.tag,
            url: job.url,
            planId: job.planId
          });
          const sentAt = new Date(now()).toISOString();
          store.markPushReminderSent(
            job.endpoint,
            job.planId,
            job.reminderAt,
            sentAt
          );
          sent += 1;
        } catch (error) {
          if ([404, 410].includes(error.statusCode)) {
            store.deletePushSubscription(job.endpoint);
          } else {
            const attemptCount = job.attemptCount + 1;
            const nextAttemptAt =
              now() + calculateRetryDelay(attemptCount);
            store.reschedulePushReminder(
              job.endpoint,
              job.planId,
              job.reminderAt,
              attemptCount,
              nextAttemptAt,
              error.message,
              new Date(now()).toISOString()
            );
          }
          failed += 1;
          logger.warn("Background reminder send failed:", error.message);
        }
      }

      return { processed: jobs.length, sent, failed };
    } finally {
      running = false;
    }
  }

  function start() {
    if (timer !== null || !pushService.isConfigured()) {
      return;
    }

    runOnce();
    timer = setInterval(runOnce, intervalMs);
  }

  function stop() {
    if (timer !== null) {
      clearInterval(timer);
      timer = null;
    }
  }

  return { runOnce, start, stop };
}

module.exports = {
  BASE_RETRY_MS,
  MAX_RETRY_MS,
  calculateRetryDelay,
  createReminderScheduler
};
