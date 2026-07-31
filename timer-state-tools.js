(function (root, factory) {
  const tools = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = tools;
  }

  root.TimerStateTools = tools;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const TIMER_STATE_STORAGE_KEY = "focus-plan-timer-state";

  function getValidInteger(value, minimum, maximum, fallback) {
    const number = Number(value);

    return Number.isInteger(number) &&
      number >= minimum &&
      number <= maximum
      ? number
      : fallback;
  }

  function normalizeTimerState(value, options) {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      return null;
    }

    const phase = value.phase === "break" ? "break" : "focus";
    const selectedMinutes = getValidInteger(
      value.selectedMinutes,
      options.minimumFocusMinutes,
      options.maximumFocusMinutes,
      options.defaultFocusMinutes
    );
    const breakMinutes = getValidInteger(
      value.breakMinutes,
      options.minimumBreakMinutes,
      options.maximumBreakMinutes,
      options.defaultBreakMinutes
    );
    const longBreakMinutes = getValidInteger(
      value.longBreakMinutes,
      options.minimumLongBreakMinutes,
      options.maximumLongBreakMinutes,
      options.defaultLongBreakMinutes
    );
    const focusesPerLongBreak = getValidInteger(
      value.focusesPerLongBreak,
      options.minimumFocusesPerLongBreak,
      options.maximumFocusesPerLongBreak,
      options.defaultFocusesPerLongBreak
    );
    const completedFocusesInCycle = getValidInteger(
      value.completedFocusesInCycle,
      0,
      focusesPerLongBreak - 1,
      0
    );
    const isLongBreak = phase === "break" && Boolean(value.isLongBreak);
    const totalSeconds =
      (
        phase === "break"
          ? (isLongBreak ? longBreakMinutes : breakMinutes)
          : selectedMinutes
      ) * 60;
    const remainingSeconds = getValidInteger(
      value.remainingSeconds,
      0,
      totalSeconds,
      totalSeconds
    );
    const endAt = Number(value.endAt);
    const hasValidEndAt = Number.isFinite(endAt) && endAt > 0;
    const isRunning = Boolean(value.isRunning) && hasValidEndAt;

    return {
      phase: phase,
      selectedMinutes: selectedMinutes,
      breakMinutes: breakMinutes,
      longBreakMinutes: longBreakMinutes,
      focusesPerLongBreak: focusesPerLongBreak,
      completedFocusesInCycle: completedFocusesInCycle,
      isLongBreak: isLongBreak,
      remainingSeconds: remainingSeconds,
      selectedPlanId: value.selectedPlanId === null ||
        value.selectedPlanId === undefined
        ? ""
        : String(value.selectedPlanId),
      isRunning: isRunning,
      endAt: isRunning ? endAt : null,
      completionRecorded: Boolean(value.completionRecorded),
      autoStartBreak: Boolean(value.autoStartBreak),
      autoStartFocus: Boolean(value.autoStartFocus)
    };
  }

  function loadTimerState(storage, options, currentTime) {
    try {
      const storedValue = storage.getItem(TIMER_STATE_STORAGE_KEY);

      if (storedValue === null) {
        return { timer: null, expired: false, recovered: false };
      }

      const timer = normalizeTimerState(JSON.parse(storedValue), options);

      if (timer === null) {
        throw new TypeError("Invalid timer state.");
      }

      let expired = false;

      if (timer.isRunning) {
        const totalSeconds = (
          timer.phase === "break"
            ? (
              timer.isLongBreak
                ? timer.longBreakMinutes
                : timer.breakMinutes
            )
            : timer.selectedMinutes
        ) * 60;
        timer.remainingSeconds = Math.min(
          totalSeconds,
          Math.max(
            0,
            Math.ceil((timer.endAt - Number(currentTime)) / 1000)
          )
        );

        if (timer.remainingSeconds === 0) {
          timer.isRunning = false;
          timer.endAt = null;
          expired = true;
        }
      }

      return { timer: timer, expired: expired, recovered: false };
    } catch (error) {
      try {
        storage.removeItem(TIMER_STATE_STORAGE_KEY);
      } catch (removeError) {
        // Storage can be unavailable in privacy-restricted contexts.
      }

      return { timer: null, expired: false, recovered: true };
    }
  }

  function saveTimerState(storage, timer) {
    const storedTimer = {
      phase: timer.phase,
      selectedMinutes: timer.selectedMinutes,
      breakMinutes: timer.breakMinutes,
      longBreakMinutes: timer.longBreakMinutes,
      focusesPerLongBreak: timer.focusesPerLongBreak,
      completedFocusesInCycle: timer.completedFocusesInCycle,
      isLongBreak: timer.isLongBreak,
      remainingSeconds: timer.remainingSeconds,
      selectedPlanId: timer.selectedPlanId,
      isRunning: timer.isRunning,
      endAt: timer.endAt,
      completionRecorded: timer.completionRecorded,
      autoStartBreak: timer.autoStartBreak,
      autoStartFocus: timer.autoStartFocus
    };

    try {
      storage.setItem(TIMER_STATE_STORAGE_KEY, JSON.stringify(storedTimer));
      return { ok: true, error: null };
    } catch (error) {
      return { ok: false, error: error };
    }
  }

  return {
    TIMER_STATE_STORAGE_KEY: TIMER_STATE_STORAGE_KEY,
    normalizeTimerState: normalizeTimerState,
    loadTimerState: loadTimerState,
    saveTimerState: saveTimerState
  };
});
