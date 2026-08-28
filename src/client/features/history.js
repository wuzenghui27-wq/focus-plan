import * as SessionTools from "../../domain/sessions.js";
import * as GoalTools from "../../domain/goals.js";
import {
  SESSION_PAGE_SIZE,
  elements,
  saveFocusSessions,
  state
} from "../core/context.js";
import { showActionFeedback } from "./plans.js";

function formatSessionTime(completedAt) {
  const date = new Date(completedAt);

  if (Number.isNaN(date.getTime())) {
    return "时间未知";
  }

  return date.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function deleteFocusSession(sessionId) {
  const confirmed = window.confirm("确定删除这条专注记录吗？");

  if (!confirmed) {
    return;
  }

  state.focusSessions = state.focusSessions.filter(function (session) {
    return session.id !== sessionId;
  });

  saveFocusSessions();
  renderSessionData();
}

function createSessionItem(session) {
  const sessionItem = document.createElement("li");
  const sessionTime = document.createElement("time");
  const sessionPlan = document.createElement("span");
  const sessionDuration = document.createElement("strong");
  const deleteButton = document.createElement("button");

  sessionItem.className = "session-item";
  sessionTime.className = "session-time";
  sessionPlan.className = "session-plan";
  sessionDuration.className = "session-duration";
  deleteButton.className = "delete-button";

  sessionTime.dateTime = session.completedAt;
  sessionTime.textContent = formatSessionTime(session.completedAt);
  sessionPlan.textContent = session.planTitle;
  sessionDuration.textContent = session.plannedMinutes + " 分钟";
  deleteButton.type = "button";
  deleteButton.textContent = "删除";

  deleteButton.addEventListener("click", function () {
    deleteFocusSession(session.id);
  });

  sessionItem.appendChild(sessionTime);
  sessionItem.appendChild(sessionPlan);
  sessionItem.appendChild(sessionDuration);
  sessionItem.appendChild(deleteButton);

  return sessionItem;
}

function updateHistoryPlanOptions() {
  const sortedSessions = [...state.focusSessions].sort(function (a, b) {
    return new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime();
  });
  const planOptions = new Map();

  sortedSessions.forEach(function (session) {
    const planKey = SessionTools.getSessionPlanKey(session);

    if (!planOptions.has(planKey)) {
      planOptions.set(planKey, session.planTitle);
    }
  });

  if (state.historyFilter.planKey && !planOptions.has(state.historyFilter.planKey)) {
    state.historyFilter.planKey = "";
  }

  elements.historyPlanFilter.innerHTML = "";

  const allOption = document.createElement("option");
  allOption.value = "";
  allOption.textContent = "全部计划";
  elements.historyPlanFilter.appendChild(allOption);

  planOptions.forEach(function (planTitle, planKey) {
    const option = document.createElement("option");
    option.value = planKey;
    option.textContent = planTitle;
    elements.historyPlanFilter.appendChild(option);
  });

  elements.historyPlanFilter.value = state.historyFilter.planKey;
}

function updateHistoryFilterControls() {
  elements.historyPeriodButtons.forEach(function (button) {
    const isActive = button.dataset.period === state.historyFilter.period;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

function renderFocusSessions() {
  updateHistoryPlanOptions();
  updateHistoryFilterControls();

  const filteredSessions = SessionTools.filterFocusSessions(
    state.focusSessions,
    state.historyFilter,
    new Date()
  ).sort(function (a, b) {
    return new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime();
  });
  const visibleSessions = filteredSessions.slice(0, state.historyFilter.visibleCount);

  elements.sessionList.innerHTML = "";
  elements.sessionEmptyMessage.hidden = filteredSessions.length > 0;
  elements.sessionEmptyMessage.textContent = state.focusSessions.length === 0
    ? "完成一次专注后，记录会出现在这里。"
    : "当前筛选条件下没有专注记录。";

  visibleSessions.forEach(function (session) {
    elements.sessionList.appendChild(createSessionItem(session));
  });

  elements.sessionSummary.textContent = filteredSessions.length +
    " 条匹配 · 显示 " + visibleSessions.length + " 条";

  const remainingCount = filteredSessions.length - visibleSessions.length;
  elements.loadMoreSessionsButton.hidden = remainingCount <= 0;
  elements.loadMoreSessionsButton.textContent = remainingCount > 0
    ? "显示更多（剩余 " + remainingCount + " 条）"
    : "显示更多";
}

/* ===== Statistics ===== */

function formatFocusDuration(totalSeconds) {
  const totalMinutes = Math.round(totalSeconds / 60);

  if (totalMinutes < 60) {
    return totalMinutes + " 分钟";
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (minutes === 0) {
    return hours + " 小时";
  }

  return hours + " 小时 " + minutes + " 分钟";
}

function renderStatistics() {
  const statistics = SessionTools.calculateFocusStatistics(
    state.focusSessions,
    new Date()
  );

  elements.todayFocusTime.textContent = formatFocusDuration(statistics.todaySeconds);
  elements.todaySessionCount.textContent = statistics.todayCount + " 次";
  elements.totalFocusTime.textContent = formatFocusDuration(statistics.totalSeconds);
  elements.longestFocusTime.textContent = formatFocusDuration(statistics.longestSeconds);
  renderDailyGoal();
  renderFocusCalendar();
  renderWeeklyComparison();
}

function renderWeeklyComparison() {
  const comparison = SessionTools.calculateWeeklyComparison(
    state.focusSessions,
    new Date()
  );

  elements.currentWeekFocusTime.textContent =
    formatFocusDuration(comparison.currentWeekSeconds);
  elements.previousWeekFocusTime.textContent =
    formatFocusDuration(comparison.previousWeekSeconds);
  elements.weeklyFocusChange.classList.remove(
    "is-positive",
    "is-negative"
  );

  if (comparison.changePercentage === null) {
    elements.weeklyFocusChange.textContent =
      comparison.currentWeekSeconds > 0
        ? "本周开始记录"
        : "暂无变化";
    return;
  }

  const prefix = comparison.changePercentage > 0 ? "+" : "";
  elements.weeklyFocusChange.textContent =
    prefix + comparison.changePercentage + "%";

  if (comparison.changePercentage > 0) {
    elements.weeklyFocusChange.classList.add("is-positive");
  } else if (comparison.changePercentage < 0) {
    elements.weeklyFocusChange.classList.add("is-negative");
  }
}

function renderDailyGoal() {
  const progress = GoalTools.calculateDailyGoalProgress(
    state.focusSessions,
    state.dailyGoalMinutes,
    new Date()
  );
  const streak = GoalTools.calculateDailyGoalStreak(
    state.focusSessions,
    state.dailyGoalMinutes,
    new Date()
  );
  const todayMinutes = Math.round(progress.todaySeconds / 60);

  elements.dailyGoalMinutesInput.value = String(state.dailyGoalMinutes);
  elements.dailyGoalSummary.textContent =
    "今日 " + todayMinutes + " / " + progress.goalMinutes +
    " 分钟 · " + progress.percentage + "%";
  elements.dailyGoalProgressBar.style.width = progress.percentage + "%";
  elements.dailyGoalProgress.setAttribute(
    "aria-valuenow",
    String(progress.percentage)
  );
  elements.dailyGoalStreak.textContent =
    "连续达标 " + streak + " 天";
}

function saveDailyGoalSetting(event) {
  event.preventDefault();

  const minutes = GoalTools.getValidDailyGoalMinutes(
    elements.dailyGoalMinutesInput.value
  );

  if (minutes === null) {
    elements.dailyGoalMinutesInput.setCustomValidity(
      "请输入 15 到 720 之间的整数。"
    );
    elements.dailyGoalMinutesInput.reportValidity();
    return;
  }

  elements.dailyGoalMinutesInput.setCustomValidity("");
  const result = GoalTools.saveDailyGoal(localStorage, minutes);

  if (!result.ok) {
    showActionFeedback("每日目标保存失败。", null);
    return;
  }

  state.dailyGoalMinutes = minutes;
  renderDailyGoal();
  showActionFeedback("每日专注目标已保存。", null);
}

function renderFocusCalendar() {
  const calendar = SessionTools.calculateMonthlyFocusCalendar(
    state.focusSessions,
    new Date()
  );
  const weekdayLabels = [
    "周一",
    "周二",
    "周三",
    "周四",
    "周五",
    "周六",
    "周日"
  ];

  elements.focusTrendChart.innerHTML = "";
  elements.focusCalendarHeading.textContent = calendar.monthLabel;
  elements.focusTrendSummary.textContent = calendar.totalSeconds > 0
    ? "专注 " + calendar.focusedDayCount + " 天 · " +
      formatFocusDuration(calendar.totalSeconds)
    : "暂无专注记录";
  elements.focusTrendChart.setAttribute(
    "aria-label",
    calendar.monthLabel + "共专注 " + calendar.focusedDayCount +
      " 天，" + formatFocusDuration(calendar.totalSeconds)
  );

  weekdayLabels.forEach(function (label) {
    const weekday = document.createElement("span");
    weekday.className = "focus-calendar-weekday";
    weekday.textContent = label;
    elements.focusTrendChart.appendChild(weekday);
  });

  for (let index = 0; index < calendar.leadingBlankCount; index += 1) {
    const blank = document.createElement("span");
    blank.className = "focus-calendar-blank";
    blank.setAttribute("aria-hidden", "true");
    elements.focusTrendChart.appendChild(blank);
  }

  calendar.days.forEach(function (day) {
    const dayItem = document.createElement("div");
    const dayNumber = document.createElement("strong");
    const duration = document.createElement("span");
    const minutes = day.totalSeconds > 0
      ? Math.max(1, Math.round(day.totalSeconds / 60))
      : 0;

    dayItem.className = "focus-calendar-day";
    dayItem.classList.toggle("has-focus", day.totalSeconds > 0);
    dayItem.classList.toggle("is-today", day.isToday);
    if (day.totalSeconds > 0) {
      const focusLevel = day.totalSeconds >= 60 * 60
        ? 3
        : day.totalSeconds >= 30 * 60 ? 2 : 1;
      dayItem.classList.add("focus-level-" + focusLevel);
    }
    dayNumber.textContent = String(day.dayNumber);
    duration.textContent = day.totalSeconds > 0 ? minutes + " 分" : "";
    dayItem.title = calendar.month + "月" + day.dayNumber + "日 · " +
      (day.totalSeconds > 0 ? "专注 " + minutes + " 分钟" : "未专注");
    dayItem.setAttribute(
      "aria-label",
      calendar.month + "月" + day.dayNumber + "日，" +
        (day.totalSeconds > 0 ? "专注 " + minutes + " 分钟" : "未专注")
    );

    dayItem.appendChild(dayNumber);
    dayItem.appendChild(duration);
    elements.focusTrendChart.appendChild(dayItem);
  });

  const occupiedCells = calendar.leadingBlankCount + calendar.days.length;
  const trailingBlankCount = (7 - occupiedCells % 7) % 7;

  for (let index = 0; index < trailingBlankCount; index += 1) {
    const blank = document.createElement("span");
    blank.className = "focus-calendar-blank";
    blank.setAttribute("aria-hidden", "true");
    elements.focusTrendChart.appendChild(blank);
  }
}

function renderSessionData() {
  renderFocusSessions();
  renderStatistics();
}

function bindHistoryEvents() {
  elements.dailyGoalForm.addEventListener("submit", saveDailyGoalSetting);
  elements.historyPeriodButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      state.historyFilter.period = button.dataset.period;
      state.historyFilter.visibleCount = SESSION_PAGE_SIZE;
      renderFocusSessions();
    });
  });
  elements.historyPlanFilter.addEventListener("change", function () {
    state.historyFilter.planKey = elements.historyPlanFilter.value;
    state.historyFilter.visibleCount = SESSION_PAGE_SIZE;
    renderFocusSessions();
  });
  elements.loadMoreSessionsButton.addEventListener("click", function () {
    state.historyFilter.visibleCount += SESSION_PAGE_SIZE;
    renderFocusSessions();
  });
}
export {
  bindHistoryEvents,
  renderFocusSessions,
  renderSessionData,
  saveDailyGoalSetting
};
