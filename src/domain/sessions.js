function isSameLocalDate(dateValue, comparisonDate) {
  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return false;
  }

  return date.getFullYear() === comparisonDate.getFullYear() &&
    date.getMonth() === comparisonDate.getMonth() &&
    date.getDate() === comparisonDate.getDate();
}

function getStartOfCurrentWeek(referenceDate) {
  const startOfWeek = new Date(referenceDate);
  const daysSinceMonday = (startOfWeek.getDay() + 6) % 7;

  startOfWeek.setDate(startOfWeek.getDate() - daysSinceMonday);
  startOfWeek.setHours(0, 0, 0, 0);

  return startOfWeek;
}

function getSessionPlanKey(session) {
  return session.planId === null ? "free" : "plan:" + session.planId;
}

function filterFocusSessions(sessions, filter, referenceDate) {
  const now = new Date(referenceDate);
  const startOfWeek = getStartOfCurrentWeek(now);

  return sessions.filter(function (session) {
    const completedDate = new Date(session.completedAt);

    if (Number.isNaN(completedDate.getTime())) {
      return false;
    }

    const matchesPeriod = filter.period === "all" ||
      (filter.period === "today" &&
        isSameLocalDate(session.completedAt, now)) ||
      (filter.period === "week" &&
        completedDate >= startOfWeek && completedDate <= now);

    const matchesPlan = filter.planKey === "" ||
      getSessionPlanKey(session) === filter.planKey;

    return matchesPeriod && matchesPlan;
  });
}

function calculateFocusStatistics(sessions, referenceDate) {
  const today = new Date(referenceDate);
  const todaySessions = sessions.filter(function (session) {
    return isSameLocalDate(session.completedAt, today);
  });

  const getSeconds = function (session) {
    const seconds = Number(session.actualSeconds);
    return Number.isFinite(seconds) && seconds > 0 ? seconds : 0;
  };

  const todaySeconds = todaySessions.reduce(function (total, session) {
    return total + getSeconds(session);
  }, 0);

  const totalSeconds = sessions.reduce(function (total, session) {
    return total + getSeconds(session);
  }, 0);

  const longestSeconds = sessions.reduce(function (longest, session) {
    return Math.max(longest, getSeconds(session));
  }, 0);

  return {
    todaySeconds,
    todayCount: todaySessions.length,
    totalSeconds,
    longestSeconds
  };
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

function calculateDailyFocusTrend(sessions, referenceDate, dayCount) {
  const numberOfDays = Number.isInteger(dayCount) && dayCount > 0
    ? dayCount
    : 7;
  const reference = new Date(referenceDate);
  const days = [];
  const daysByKey = new Map();

  reference.setHours(0, 0, 0, 0);

  for (let offset = numberOfDays - 1; offset >= 0; offset -= 1) {
    const date = new Date(reference);
    date.setDate(reference.getDate() - offset);

    const day = {
      dateKey: getLocalDateKey(date),
      weekday: date.toLocaleDateString("zh-CN", { weekday: "short" }),
      dateLabel: date.toLocaleDateString("zh-CN", {
        month: "2-digit",
        day: "2-digit"
      }),
      totalSeconds: 0
    };

    days.push(day);
    daysByKey.set(day.dateKey, day);
  }

  sessions.forEach(function (session) {
    const day = daysByKey.get(getLocalDateKey(session.completedAt));
    const seconds = Number(session.actualSeconds);

    if (day && Number.isFinite(seconds) && seconds > 0) {
      day.totalSeconds += seconds;
    }
  });

  return days;
}

function calculateMonthlyFocusCalendar(sessions, referenceDate) {
  const reference = new Date(referenceDate);
  const year = reference.getFullYear();
  const monthIndex = reference.getMonth();
  const firstDay = new Date(year, monthIndex, 1);
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const days = [];
  const daysByKey = new Map();

  for (let dayNumber = 1; dayNumber <= daysInMonth; dayNumber += 1) {
    const date = new Date(year, monthIndex, dayNumber);
    const day = {
      dateKey: getLocalDateKey(date),
      dayNumber: dayNumber,
      totalSeconds: 0,
      isToday: isSameLocalDate(date, reference)
    };

    days.push(day);
    daysByKey.set(day.dateKey, day);
  }

  sessions.forEach(function (session) {
    const completedAt = new Date(session.completedAt);
    const seconds = Number(session.actualSeconds);

    if (
      Number.isNaN(completedAt.getTime()) ||
      completedAt > reference ||
      !Number.isFinite(seconds) ||
      seconds <= 0
    ) {
      return;
    }

    const day = daysByKey.get(getLocalDateKey(completedAt));

    if (day) {
      day.totalSeconds += seconds;
    }
  });

  const totalSeconds = days.reduce(function (total, day) {
    return total + day.totalSeconds;
  }, 0);
  const focusedDayCount = days.filter(function (day) {
    return day.totalSeconds > 0;
  }).length;

  return {
    year: year,
    month: monthIndex + 1,
    monthLabel: year + "年" + (monthIndex + 1) + "月",
    leadingBlankCount: (firstDay.getDay() + 6) % 7,
    days: days,
    totalSeconds: totalSeconds,
    focusedDayCount: focusedDayCount
  };
}

function calculateWeeklyComparison(sessions, referenceDate) {
  const now = new Date(referenceDate);
  const currentWeekStart = getStartOfCurrentWeek(now);
  const previousWeekStart = new Date(currentWeekStart);

  previousWeekStart.setDate(previousWeekStart.getDate() - 7);

  const totals = sessions.reduce(function (result, session) {
    const completedAt = new Date(session.completedAt);
    const seconds = Number(session.actualSeconds);

    if (
      Number.isNaN(completedAt.getTime()) ||
      !Number.isFinite(seconds) ||
      seconds <= 0 ||
      completedAt > now
    ) {
      return result;
    }

    if (completedAt >= currentWeekStart) {
      result.currentWeekSeconds += seconds;
    } else if (completedAt >= previousWeekStart) {
      result.previousWeekSeconds += seconds;
    }

    return result;
  }, {
    currentWeekSeconds: 0,
    previousWeekSeconds: 0
  });

  const changePercentage = totals.previousWeekSeconds > 0
    ? Math.round(
      (totals.currentWeekSeconds - totals.previousWeekSeconds) /
      totals.previousWeekSeconds * 100
    )
    : null;

  return {
    currentWeekSeconds: totals.currentWeekSeconds,
    previousWeekSeconds: totals.previousWeekSeconds,
    changePercentage: changePercentage
  };
}


export {
  isSameLocalDate,
  getStartOfCurrentWeek,
  getSessionPlanKey,
  filterFocusSessions,
  calculateFocusStatistics,
  getLocalDateKey,
  calculateDailyFocusTrend,
  calculateMonthlyFocusCalendar,
  calculateWeeklyComparison
};
