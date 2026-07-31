(function (root, factory) {
  const tools = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = tools;
  }

  root.PushReminderTools = tools;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const MAX_REMINDER_JOBS = 500;
  const VALID_REMINDER_MINUTES = new Set([0, 5, 15, 30, 60]);

  function parseTime(value) {
    const time = new Date(value).getTime();
    return typeof value === "string" && Number.isFinite(time) ? time : null;
  }

  function getPlanReminderTime(plan) {
    const snoozedTime = parseTime(plan?.snoozedUntil);

    if (snoozedTime !== null) {
      return snoozedTime;
    }

    const dueTime = parseTime(plan?.dueAt);
    const rawMinutes = Number(plan?.reminderMinutes);
    const reminderMinutes = VALID_REMINDER_MINUTES.has(rawMinutes)
      ? rawMinutes
      : 0;

    return dueTime === null
      ? null
      : dueTime - reminderMinutes * 60 * 1000;
  }

  function createNotificationTitle(plan, reminderTime) {
    if (parseTime(plan?.snoozedUntil) !== null) {
      return "稍后提醒时间到了";
    }

    const dueTime = parseTime(plan?.dueAt);
    return dueTime !== null && reminderTime < dueTime
      ? "计划即将到期"
      : "计划时间到了";
  }

  function createReminderJobs(plans) {
    if (!Array.isArray(plans)) {
      return [];
    }

    return plans
      .filter(function (plan) {
        return plan &&
          !plan.completed &&
          !plan.reminded &&
          plan.dueAt;
      })
      .slice(0, MAX_REMINDER_JOBS)
      .map(function (plan) {
        const reminderTime = getPlanReminderTime(plan);

        if (reminderTime === null) {
          return null;
        }

        const planId = String(plan.id);
        return {
          planId,
          reminderAt: new Date(reminderTime).toISOString(),
          notificationTitle: createNotificationTitle(plan, reminderTime),
          body: String(plan.title || "未命名计划").slice(0, 120),
          tag: ("plan-" + planId)
            .replace(/[^A-Za-z0-9_-]/g, "-")
            .slice(0, 32),
          url: "./#plans"
        };
      })
      .filter(Boolean);
  }

  function normalizeReminderJobs(value) {
    if (!Array.isArray(value) || value.length > MAX_REMINDER_JOBS) {
      throw new Error("后台提醒任务格式无效。");
    }

    const normalized = new Map();

    value.forEach(function (job) {
      const planId = String(job?.planId || "").slice(0, 80);
      const reminderTime = parseTime(job?.reminderAt);
      const notificationTitle =
        String(job?.notificationTitle || "").trim().slice(0, 80);
      const body = String(job?.body || "").trim().slice(0, 120);
      const tag = String(job?.tag || "")
        .replace(/[^A-Za-z0-9_-]/g, "-")
        .slice(0, 32);
      const url = String(job?.url || "");

      if (
        planId === "" ||
        reminderTime === null ||
        notificationTitle === "" ||
        body === "" ||
        tag === "" ||
        !["./#plans", "./#focus", "./#settings"].includes(url)
      ) {
        throw new Error("后台提醒任务格式无效。");
      }

      normalized.set(planId, {
        planId,
        reminderAt: new Date(reminderTime).toISOString(),
        notificationTitle,
        body,
        tag,
        url
      });
    });

    return Array.from(normalized.values());
  }

  return {
    MAX_REMINDER_JOBS,
    getPlanReminderTime,
    createReminderJobs,
    normalizeReminderJobs
  };
});
