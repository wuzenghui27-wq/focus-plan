const MIN_BREAK_MINUTES = 1;
const MAX_BREAK_MINUTES = 60;
const DEFAULT_BREAK_MINUTES = 5;
const DEFAULT_LONG_BREAK_MINUTES = 15;
const MIN_FOCUSES_PER_LONG_BREAK = 2;
const MAX_FOCUSES_PER_LONG_BREAK = 6;
const DEFAULT_FOCUSES_PER_LONG_BREAK = 4;

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

function getValidFocusesPerLongBreak(value) {
  const focuses = Number(value);

  if (
    !Number.isInteger(focuses) ||
    focuses < MIN_FOCUSES_PER_LONG_BREAK ||
    focuses > MAX_FOCUSES_PER_LONG_BREAK
  ) {
    return null;
  }

  return focuses;
}

function shouldUseLongBreak(completedFocuses, focusesPerLongBreak) {
  const target = getValidFocusesPerLongBreak(focusesPerLongBreak) ||
    DEFAULT_FOCUSES_PER_LONG_BREAK;

  return Number(completedFocuses) >= target;
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


export {
  MIN_BREAK_MINUTES,
  MAX_BREAK_MINUTES,
  DEFAULT_BREAK_MINUTES,
  DEFAULT_LONG_BREAK_MINUTES,
  MIN_FOCUSES_PER_LONG_BREAK,
  MAX_FOCUSES_PER_LONG_BREAK,
  DEFAULT_FOCUSES_PER_LONG_BREAK,
  normalizePhase,
  getValidBreakMinutes,
  getPhaseDurationSeconds,
  getNextPhase,
  getValidFocusesPerLongBreak,
  shouldUseLongBreak,
  getBreakDurationMinutes
};
