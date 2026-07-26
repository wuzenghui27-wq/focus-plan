(function (globalScope) {
  function calculateLongestFocusStreak(sessions) {
    const uniqueDays = new Set();

    sessions.forEach(function (session) {
      const date = new Date(session.completedAt);

      if (Number.isNaN(date.getTime())) {
        return;
      }

      const dayNumber = Math.floor(Date.UTC(
        date.getFullYear(),
        date.getMonth(),
        date.getDate()
      ) / 86400000);

      uniqueDays.add(dayNumber);
    });

    const sortedDays = [...uniqueDays].sort(function (a, b) {
      return a - b;
    });

    let longestStreak = 0;
    let currentStreak = 0;
    let previousDay = null;

    sortedDays.forEach(function (day) {
      currentStreak = previousDay !== null && day === previousDay + 1
        ? currentStreak + 1
        : 1;
      longestStreak = Math.max(longestStreak, currentStreak);
      previousDay = day;
    });

    return longestStreak;
  }

  const achievements = [
    {
      id: "first-focus",
      mark: "01",
      title: "初次专注",
      description: "完成第一次专注",
      isUnlocked: function (sessions) {
        return sessions.length >= 1;
      }
    },
    {
      id: "total-hour",
      mark: "02",
      title: "渐入佳境",
      description: "累计专注达到 60 分钟",
      isUnlocked: function (sessions) {
        const totalSeconds = sessions.reduce(function (total, session) {
          return total + session.actualSeconds;
        }, 0);

        return totalSeconds >= 60 * 60;
      }
    },
    {
      id: "five-sessions",
      mark: "03",
      title: "坚持不懈",
      description: "完成 5 次专注",
      isUnlocked: function (sessions) {
        return sessions.length >= 5;
      }
    },
    {
      id: "deep-focus",
      mark: "04",
      title: "深度工作",
      description: "单次专注达到 60 分钟",
      isUnlocked: function (sessions) {
        return sessions.some(function (session) {
          return session.actualSeconds >= 60 * 60;
        });
      }
    },
    {
      id: "three-day-streak",
      mark: "05",
      title: "连续行动",
      description: "连续 3 天完成专注",
      isUnlocked: function (sessions) {
        return calculateLongestFocusStreak(sessions) >= 3;
      }
    }
  ];

  const achievementRules = {
    achievements,
    calculateLongestFocusStreak
  };

  if (typeof module === "object" && module.exports) {
    module.exports = achievementRules;
  }

  globalScope.AchievementRules = achievementRules;
})(globalThis);
