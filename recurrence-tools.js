(function (root, factory) {
  const tools = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = tools;
  }

  root.RecurrenceTools = tools;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const REPEAT_VALUES = ["none", "daily", "weekly"];

  function normalizeRepeat(value) {
    return REPEAT_VALUES.includes(value) ? value : "none";
  }

  function formatLocalDateTime(date) {
    const pad = function (value) {
      return String(value).padStart(2, "0");
    };

    return date.getFullYear() + "-" +
      pad(date.getMonth() + 1) + "-" +
      pad(date.getDate()) + "T" +
      pad(date.getHours()) + ":" +
      pad(date.getMinutes());
  }

  function calculateNextDueAt(dueAt, repeat) {
    const normalizedRepeat = normalizeRepeat(repeat);
    const date = new Date(dueAt);

    if (
      normalizedRepeat === "none" ||
      !dueAt ||
      Number.isNaN(date.getTime())
    ) {
      return "";
    }

    date.setDate(
      date.getDate() + (normalizedRepeat === "daily" ? 1 : 7)
    );

    return formatLocalDateTime(date);
  }

  function createNextOccurrence(plan, id) {
    const nextDueAt = calculateNextDueAt(plan.dueAt, plan.repeat);

    if (nextDueAt === "") {
      return null;
    }

    return {
      id: id,
      title: plan.title,
      tag: plan.tag || "",
      notes: plan.notes || "",
      subtasks: Array.isArray(plan.subtasks)
        ? plan.subtasks.map(function (subtask) {
          return {
            id: subtask.id,
            text: subtask.text,
            completed: false
          };
        })
        : [],
      priority: plan.priority,
      dueAt: nextDueAt,
      repeat: normalizeRepeat(plan.repeat),
      reminderMinutes: Number(plan.reminderMinutes) || 0,
      reminded: false,
      snoozedUntil: null,
      completed: false,
      nextOccurrenceCreated: false,
      generatedFromId: plan.id
    };
  }

  return {
    REPEAT_VALUES: REPEAT_VALUES,
    normalizeRepeat: normalizeRepeat,
    formatLocalDateTime: formatLocalDateTime,
    calculateNextDueAt: calculateNextDueAt,
    createNextOccurrence: createNextOccurrence
  };
});
