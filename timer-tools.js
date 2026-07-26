(function (root, factory) {
  const tools = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = tools;
  }

  root.TimerTools = tools;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function getValidMinutes(value, minimum, maximum) {
    const minutes = Number(value);

    if (
      !Number.isInteger(minutes) ||
      minutes < minimum ||
      minutes > maximum
    ) {
      return null;
    }

    return minutes;
  }

  function formatTimer(seconds) {
    const safeSeconds = Math.max(0, Math.floor(Number(seconds) || 0));
    const minutesPart = Math.floor(safeSeconds / 60);
    const secondsPart = safeSeconds % 60;

    return String(minutesPart).padStart(2, "0") + ":" +
      String(secondsPart).padStart(2, "0");
  }

  function calculateRemainingSeconds(endAt, now) {
    const endTime = Number(endAt);
    const currentTime = Number(now);

    if (!Number.isFinite(endTime) || !Number.isFinite(currentTime)) {
      return 0;
    }

    return Math.max(0, Math.ceil((endTime - currentTime) / 1000));
  }

  return {
    getValidMinutes: getValidMinutes,
    formatTimer: formatTimer,
    calculateRemainingSeconds: calculateRemainingSeconds
  };
});
