const DAILY_GOAL_STORAGE_KEY = "focus-plan-daily-goal";
const DEFAULT_DAILY_GOAL_MINUTES = 120;
const MIN_DAILY_GOAL_MINUTES = 15;
const MAX_DAILY_GOAL_MINUTES = 720;

function getValidDailyGoalMinutes(value) {
  const minutes = Number(value);

  if (
    !Number.isInteger(minutes) ||
    minutes < MIN_DAILY_GOAL_MINUTES ||
    minutes > MAX_DAILY_GOAL_MINUTES
  ) {
    return null;
  }

  return minutes;
}

function loadDailyGoal(storage) {
  try {
    return getValidDailyGoalMinutes(
      storage.getItem(DAILY_GOAL_STORAGE_KEY)
    ) || DEFAULT_DAILY_GOAL_MINUTES;
  } catch (error) {
    return DEFAULT_DAILY_GOAL_MINUTES;
  }
}

function saveDailyGoal(storage, minutes) {
  const validMinutes = getValidDailyGoalMinutes(minutes);

  if (validMinutes === null) {
    return { ok: false, error: new TypeError("Invalid daily goal.") };
  }

  try {
    storage.setItem(DAILY_GOAL_STORAGE_KEY, String(validMinutes));
    return { ok: true, error: null };
  } catch (error) {
    return { ok: false, error: error };
  }
}

function getLocalDateKey(dateValue) {
  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")
  ].join("-");
}

function getDailySecondsMap(sessions) {
  return sessions.reduce(function (secondsByDate, session) {
    const dateKey = getLocalDateKey(session.completedAt);
    const seconds = Number(session.actualSeconds);

    if (dateKey && Number.isFinite(seconds) && seconds > 0) {
      secondsByDate.set(
        dateKey,
        (secondsByDate.get(dateKey) || 0) + seconds
      );
    }

    return secondsByDate;
  }, new Map());
}

function calculateDailyGoalProgress(sessions, goalMinutes, referenceDate) {
  const validGoal = getValidDailyGoalMinutes(goalMinutes) ||
    DEFAULT_DAILY_GOAL_MINUTES;
  const goalSeconds = validGoal * 60;
  const todaySeconds =
    getDailySecondsMap(sessions).get(getLocalDateKey(referenceDate)) || 0;

  return {
    goalMinutes: validGoal,
    todaySeconds: todaySeconds,
    percentage: Math.min(100, Math.round(todaySeconds / goalSeconds * 100)),
    reached: todaySeconds >= goalSeconds
  };
}

function calculateDailyGoalStreak(sessions, goalMinutes, referenceDate) {
  const validGoal = getValidDailyGoalMinutes(goalMinutes) ||
    DEFAULT_DAILY_GOAL_MINUTES;
  const goalSeconds = validGoal * 60;
  const secondsByDate = getDailySecondsMap(sessions);
  const cursor = new Date(referenceDate);
  let streak = 0;

  cursor.setHours(0, 0, 0, 0);

  if ((secondsByDate.get(getLocalDateKey(cursor)) || 0) < goalSeconds) {
    cursor.setDate(cursor.getDate() - 1);
  }

  while (
    (secondsByDate.get(getLocalDateKey(cursor)) || 0) >= goalSeconds
  ) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}


export {
  DAILY_GOAL_STORAGE_KEY,
  DEFAULT_DAILY_GOAL_MINUTES,
  MIN_DAILY_GOAL_MINUTES,
  MAX_DAILY_GOAL_MINUTES,
  getValidDailyGoalMinutes,
  loadDailyGoal,
  saveDailyGoal,
  calculateDailyGoalProgress,
  calculateDailyGoalStreak
};
