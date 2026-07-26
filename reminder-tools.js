(function (root, factory) {
  const tools = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = tools;
  }

  root.ReminderTools = tools;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const REMINDER_MINUTE_VALUES = [0, 5, 15, 30, 60];

  function normalizeReminderMinutes(value) {
    const minutes = Number(value);

    return REMINDER_MINUTE_VALUES.includes(minutes) ? minutes : 0;
  }

  function calculateReminderAt(dueAt, reminderMinutes) {
    const dueTime = new Date(dueAt).getTime();

    if (!dueAt || Number.isNaN(dueTime)) {
      return null;
    }

    return dueTime -
      normalizeReminderMinutes(reminderMinutes) * 60 * 1000;
  }

  function isPlanReminderDue(plan, currentTime) {
    if (
      !plan ||
      plan.completed ||
      plan.reminded ||
      !plan.dueAt
    ) {
      return false;
    }

    const reminderAt = calculateReminderAt(
      plan.dueAt,
      plan.reminderMinutes
    );
    const now = Number(currentTime);

    return reminderAt !== null &&
      Number.isFinite(now) &&
      now >= reminderAt;
  }

  return {
    REMINDER_MINUTE_VALUES: REMINDER_MINUTE_VALUES,
    normalizeReminderMinutes: normalizeReminderMinutes,
    calculateReminderAt: calculateReminderAt,
    isPlanReminderDue: isPlanReminderDue
  };
});
