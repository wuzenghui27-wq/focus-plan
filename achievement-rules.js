(function (globalScope) {
  function getValidSessions(sessions) {
    if (!Array.isArray(sessions)) {
      return [];
    }

    return sessions.filter(function (session) {
      return session &&
        Number.isFinite(session.actualSeconds) &&
        session.actualSeconds > 0;
    });
  }

  function calculateLongestFocusStreak(sessions) {
    const uniqueDays = new Set();

    getValidSessions(sessions).forEach(function (session) {
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

  function calculateAchievementMetrics(sessions) {
    const validSessions = getValidSessions(sessions);

    return {
      sessionCount: validSessions.length,
      totalSeconds: validSessions.reduce(function (total, session) {
        return total + session.actualSeconds;
      }, 0),
      longestStreak: calculateLongestFocusStreak(validSessions),
      longestSessionSeconds: validSessions.reduce(function (longest, session) {
        return Math.max(longest, session.actualSeconds);
      }, 0)
    };
  }

  const achievementCategories = [
    {
      id: "sessions",
      title: "专注次数",
      description: "一次次完成，建立稳定节奏"
    },
    {
      id: "duration",
      title: "累计时长",
      description: "让投入的时间持续增长"
    },
    {
      id: "streak",
      title: "连续专注",
      description: "把专注变成每天的习惯"
    },
    {
      id: "depth",
      title: "深度专注",
      description: "逐步进入更长的沉浸状态"
    }
  ];

  const achievementDefinitions = [
    {
      id: "first-focus",
      category: "sessions",
      tier: 1,
      title: "开始行动",
      description: "完成第一次专注",
      metric: "sessionCount",
      target: 1,
      valueType: "count"
    },
    {
      id: "ten-sessions",
      legacyIds: ["five-sessions"],
      category: "sessions",
      tier: 2,
      title: "渐成节奏",
      description: "累计完成 10 次专注",
      metric: "sessionCount",
      target: 10,
      valueType: "count"
    },
    {
      id: "fifty-sessions",
      category: "sessions",
      tier: 3,
      title: "稳定投入",
      description: "累计完成 50 次专注",
      metric: "sessionCount",
      target: 50,
      valueType: "count"
    },
    {
      id: "total-hour",
      category: "duration",
      tier: 1,
      title: "积少成多",
      description: "累计专注达到 1 小时",
      metric: "totalSeconds",
      target: 60 * 60,
      valueType: "duration"
    },
    {
      id: "total-ten-hours",
      category: "duration",
      tier: 2,
      title: "专注积累",
      description: "累计专注达到 10 小时",
      metric: "totalSeconds",
      target: 10 * 60 * 60,
      valueType: "duration"
    },
    {
      id: "total-fifty-hours",
      category: "duration",
      tier: 3,
      title: "长期主义",
      description: "累计专注达到 50 小时",
      metric: "totalSeconds",
      target: 50 * 60 * 60,
      valueType: "duration"
    },
    {
      id: "three-day-streak",
      category: "streak",
      tier: 1,
      title: "连续行动",
      description: "连续 3 天完成专注",
      metric: "longestStreak",
      target: 3,
      valueType: "days"
    },
    {
      id: "seven-day-streak",
      category: "streak",
      tier: 2,
      title: "完整一周",
      description: "连续 7 天完成专注",
      metric: "longestStreak",
      target: 7,
      valueType: "days"
    },
    {
      id: "twenty-one-day-streak",
      category: "streak",
      tier: 3,
      title: "习惯成形",
      description: "连续 21 天完成专注",
      metric: "longestStreak",
      target: 21,
      valueType: "days"
    },
    {
      id: "deep-forty-five",
      category: "depth",
      tier: 1,
      title: "进入状态",
      description: "单次专注达到 45 分钟",
      metric: "longestSessionSeconds",
      target: 45 * 60,
      valueType: "duration"
    },
    {
      id: "deep-focus",
      category: "depth",
      tier: 2,
      title: "深度工作",
      description: "单次专注达到 60 分钟",
      metric: "longestSessionSeconds",
      target: 60 * 60,
      valueType: "duration"
    },
    {
      id: "deep-ninety",
      category: "depth",
      tier: 3,
      title: "沉浸专注",
      description: "单次专注达到 90 分钟",
      metric: "longestSessionSeconds",
      target: 90 * 60,
      valueType: "duration"
    }
  ];

  function getAchievementProgress(achievement, sessionsOrMetrics) {
    const metrics = Array.isArray(sessionsOrMetrics)
      ? calculateAchievementMetrics(sessionsOrMetrics)
      : sessionsOrMetrics;
    const currentValue = Math.max(0, metrics[achievement.metric] || 0);
    const progress = Math.min(1, currentValue / achievement.target);

    return {
      currentValue,
      targetValue: achievement.target,
      progress,
      percentage: Math.round(progress * 100),
      isUnlocked: currentValue >= achievement.target
    };
  }

  const achievements = achievementDefinitions.map(function (definition) {
    return Object.assign({}, definition, {
      mark: String(definition.tier).padStart(2, "0"),
      isUnlocked: function (sessions) {
        return getAchievementProgress(definition, sessions).isUnlocked;
      }
    });
  });

  const achievementRules = {
    achievements,
    achievementCategories,
    calculateLongestFocusStreak,
    calculateAchievementMetrics,
    getAchievementProgress
  };

  if (typeof module === "object" && module.exports) {
    module.exports = achievementRules;
  }

  globalScope.AchievementRules = achievementRules;
})(globalThis);
