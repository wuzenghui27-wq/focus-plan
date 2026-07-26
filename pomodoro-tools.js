(function (root, factory) {
  const tools = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = tools;
  }

  root.PomodoroTools = tools;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const MIN_BREAK_MINUTES = 1;
  const MAX_BREAK_MINUTES = 60;
  const DEFAULT_BREAK_MINUTES = 5;
  const DEFAULT_LONG_BREAK_MINUTES = 15;
  const FOCUSES_PER_LONG_BREAK = 4;

  function normalizePhase(value) {
    return value === "break" ? "break" : "focus";
  }

  function getValidBreakMinutes(value) {
    const minutes = Number(value);

    if (
      !Number.isInteger(minutes) ||
      minutes < MIN_BREAK_MINUTES ||
      minutes > MAX_BREAK_MINUTES
    ) {
      return null;
    }

    return minutes;
  }

  function getPhaseDurationSeconds(phase, focusMinutes, breakMinutes) {
    const minutes = normalizePhase(phase) === "break"
      ? getValidBreakMinutes(breakMinutes) || DEFAULT_BREAK_MINUTES
      : Number(focusMinutes);

    return Math.max(0, Math.floor(minutes * 60));
  }

  function getNextPhase(phase) {
    return normalizePhase(phase) === "focus" ? "break" : "focus";
  }

  function shouldUseLongBreak(completedFocuses) {
    return Number(completedFocuses) >= FOCUSES_PER_LONG_BREAK;
  }

  function getBreakDurationMinutes(
    isLongBreak,
    breakMinutes,
    longBreakMinutes
  ) {
    const selectedMinutes = isLongBreak
      ? longBreakMinutes
      : breakMinutes;

    return getValidBreakMinutes(selectedMinutes) ||
      (isLongBreak ? DEFAULT_LONG_BREAK_MINUTES : DEFAULT_BREAK_MINUTES);
  }

  return {
    MIN_BREAK_MINUTES: MIN_BREAK_MINUTES,
    MAX_BREAK_MINUTES: MAX_BREAK_MINUTES,
    DEFAULT_BREAK_MINUTES: DEFAULT_BREAK_MINUTES,
    DEFAULT_LONG_BREAK_MINUTES: DEFAULT_LONG_BREAK_MINUTES,
    FOCUSES_PER_LONG_BREAK: FOCUSES_PER_LONG_BREAK,
    normalizePhase: normalizePhase,
    getValidBreakMinutes: getValidBreakMinutes,
    getPhaseDurationSeconds: getPhaseDurationSeconds,
    getNextPhase: getNextPhase,
    shouldUseLongBreak: shouldUseLongBreak,
    getBreakDurationMinutes: getBreakDurationMinutes
  };
});
