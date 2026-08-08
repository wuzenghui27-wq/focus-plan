const REMINDER_MINUTE_VALUES = [0, 5, 15, 30, 60];
const SNOOZE_MINUTE_VALUES = [5, 15, 60];

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

function normalizeSnoozedUntil(value) {
  const snoozedTime = new Date(value).getTime();

  if (typeof value !== "string" || Number.isNaN(snoozedTime)) {
    return null;
  }

  return new Date(snoozedTime).toISOString();
}

function calculateSnoozedUntil(currentTime, snoozeMinutes) {
  const now = Number(currentTime);
  const minutes = Number(snoozeMinutes);

  if (
    !Number.isFinite(now) ||
    !SNOOZE_MINUTE_VALUES.includes(minutes)
  ) {
    return null;
  }

  return new Date(now + minutes * 60 * 1000).toISOString();
}

function getPlanReminderAt(plan) {
  const snoozedUntil = normalizeSnoozedUntil(plan?.snoozedUntil);

  if (snoozedUntil !== null) {
    return new Date(snoozedUntil).getTime();
  }

  return calculateReminderAt(plan?.dueAt, plan?.reminderMinutes);
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

  const reminderAt = getPlanReminderAt(plan);
  const now = Number(currentTime);

  return reminderAt !== null &&
    Number.isFinite(now) &&
    now >= reminderAt;
}


export {
  REMINDER_MINUTE_VALUES,
  SNOOZE_MINUTE_VALUES,
  normalizeReminderMinutes,
  calculateReminderAt,
  normalizeSnoozedUntil,
  calculateSnoozedUntil,
  getPlanReminderAt,
  isPlanReminderDue
};
