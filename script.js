/* ===== Startup check ===== */

const REQUIRED_MODULES = [
  "AchievementRules",
  "BackupTools",
  "SessionTools",
  "StorageTools",
  "TimerTools",
  "ThemeTools",
  "PlanTools",
  "UndoTools",
  "ShortcutTools",
  "RecurrenceTools",
  "ReminderTools",
  "TextTools",
  "SubtaskTools",
  "GoalTools",
  "PomodoroTools",
  "TimerStateTools",
  "SoundTools",
  "NavigationTools",
  "PwaTools"
];
const missingModules = REQUIRED_MODULES.filter(function (moduleName) {
  return !window[moduleName];
});

if (missingModules.length > 0) {
  const startupError = document.querySelector("#startupError");

  if (startupError) {
    startupError.textContent =
      "应用启动失败：缺少必要脚本，请刷新页面或重新启动本地服务。";
    startupError.hidden = false;
  }

  throw new Error("Missing modules: " + missingModules.join(", "));
}

/* ===== Configuration ===== */

const STORAGE_KEY = "focus-plan-plans";
const SESSION_STORAGE_KEY = "focus-plan-sessions";
const ACHIEVEMENT_STORAGE_KEY = "focus-plan-achievements";
const BACKUP_VERSION = window.BackupTools.BACKUP_VERSION;
const DEFAULT_TIMER_MINUTES = 25;
const MIN_TIMER_MINUTES = 1;
const MAX_TIMER_MINUTES = 180;
const REMINDER_CHECK_MS = 30000;
const SESSION_PAGE_SIZE = 10;
const TIMER_STATE_OPTIONS = {
  minimumFocusMinutes: MIN_TIMER_MINUTES,
  maximumFocusMinutes: MAX_TIMER_MINUTES,
  defaultFocusMinutes: DEFAULT_TIMER_MINUTES,
  minimumBreakMinutes: window.PomodoroTools.MIN_BREAK_MINUTES,
  maximumBreakMinutes: window.PomodoroTools.MAX_BREAK_MINUTES,
  defaultBreakMinutes: window.PomodoroTools.DEFAULT_BREAK_MINUTES,
  minimumLongBreakMinutes: window.PomodoroTools.MIN_BREAK_MINUTES,
  maximumLongBreakMinutes: window.PomodoroTools.MAX_BREAK_MINUTES,
  defaultLongBreakMinutes:
    window.PomodoroTools.DEFAULT_LONG_BREAK_MINUTES,
  focusesPerLongBreak: window.PomodoroTools.FOCUSES_PER_LONG_BREAK
};
const restoredTimerResult = window.TimerStateTools.loadTimerState(
  localStorage,
  TIMER_STATE_OPTIONS,
  Date.now()
);
const restoredSoundResult = window.SoundTools.loadSoundSettings(localStorage);
let timerAudioContext = null;

const PRIORITY_LABELS = {
  low: "低",
  medium: "中",
  high: "高"
};
const REPEAT_LABELS = {
  none: "",
  daily: "每天重复",
  weekly: "每周重复"
};
const REMINDER_LABELS = {
  5: "提前 5 分钟提醒",
  15: "提前 15 分钟提醒",
  30: "提前 30 分钟提醒",
  60: "提前 1 小时提醒"
};

const ACHIEVEMENTS = window.AchievementRules.achievements;
const calculateLongestFocusStreak =
  window.AchievementRules.calculateLongestFocusStreak;
const BACKUP_VALIDATION_OPTIONS = {
  priorityValues: Object.keys(PRIORITY_LABELS),
  repeatValues: window.RecurrenceTools.REPEAT_VALUES,
  reminderMinuteValues: window.ReminderTools.REMINDER_MINUTE_VALUES,
  normalizeSubtasks: window.SubtaskTools.normalizeSubtasks,
  achievementIds: ACHIEVEMENTS.map(function (achievement) {
    return achievement.id;
  })
};
const storageRecoveryLabels = [];

if (restoredTimerResult.recovered) {
  storageRecoveryLabels.push("计时器");
}

if (restoredSoundResult.recovered) {
  storageRecoveryLabels.push("提示音");
}

/* ===== DOM references ===== */

const elements = {
  appPages: document.querySelectorAll(".app-page"),
  appTabs: document.querySelectorAll(".app-tab"),
  themeToggle: document.querySelector("#themeToggle"),
  themeLabel: document.querySelector("#themeLabel"),
  createPlanButton: document.querySelector("#createPlanButton"),
  notificationButton: document.querySelector("#notificationButton"),
  installAppButton: document.querySelector("#installAppButton"),
  installAppStatus: document.querySelector("#installAppStatus"),
  offlineAppStatus: document.querySelector("#offlineAppStatus"),
  planForm: document.querySelector("#planForm"),
  planTitleInput: document.querySelector("#planTitle"),
  planPriorityInput: document.querySelector("#planPriority"),
  planTagInput: document.querySelector("#planTag"),
  planDueAtInput: document.querySelector("#planDueAt"),
  planRepeatInput: document.querySelector("#planRepeat"),
  planReminderMinutesInput: document.querySelector("#planReminderMinutes"),
  planNotesInput: document.querySelector("#planNotes"),
  savePlanButton: document.querySelector("#savePlanButton"),
  cancelPlanButton: document.querySelector("#cancelPlanButton"),
  planSearchInput: document.querySelector("#planSearchInput"),
  planStatusButtons: document.querySelectorAll(".plan-status-button"),
  planSortSelect: document.querySelector("#planSortSelect"),
  planTagFilter: document.querySelector("#planTagFilter"),
  batchModeButton: document.querySelector("#batchModeButton"),
  batchActionBar: document.querySelector("#batchActionBar"),
  batchSelectAll: document.querySelector("#batchSelectAll"),
  batchSelectionSummary: document.querySelector("#batchSelectionSummary"),
  batchCompleteButton: document.querySelector("#batchCompleteButton"),
  batchDeleteButton: document.querySelector("#batchDeleteButton"),
  batchCancelButton: document.querySelector("#batchCancelButton"),
  planList: document.querySelector("#planList"),
  emptyMessage: document.querySelector("#planEmptyMessage"),
  planSummary: document.querySelector("#planSummary"),
  todayFocusTime: document.querySelector("#todayFocusTime"),
  todaySessionCount: document.querySelector("#todaySessionCount"),
  totalFocusTime: document.querySelector("#totalFocusTime"),
  longestFocusTime: document.querySelector("#longestFocusTime"),
  focusTrendSummary: document.querySelector("#focusTrendSummary"),
  focusTrendChart: document.querySelector("#focusTrendChart"),
  dailyGoalForm: document.querySelector("#dailyGoalForm"),
  dailyGoalMinutesInput: document.querySelector("#dailyGoalMinutes"),
  dailyGoalSummary: document.querySelector("#dailyGoalSummary"),
  dailyGoalProgress: document.querySelector("#dailyGoalProgress"),
  dailyGoalProgressBar: document.querySelector("#dailyGoalProgressBar"),
  dailyGoalStreak: document.querySelector("#dailyGoalStreak"),
  currentWeekFocusTime: document.querySelector("#currentWeekFocusTime"),
  previousWeekFocusTime: document.querySelector("#previousWeekFocusTime"),
  weeklyFocusChange: document.querySelector("#weeklyFocusChange"),
  achievementList: document.querySelector("#achievementList"),
  achievementSummary: document.querySelector("#achievementSummary"),
  achievementToast: document.querySelector("#achievementToast"),
  actionToast: document.querySelector("#actionToast"),
  actionToastMessage: document.querySelector("#actionToastMessage"),
  undoActionButton: document.querySelector("#undoActionButton"),
  sessionList: document.querySelector("#sessionList"),
  sessionSummary: document.querySelector("#sessionSummary"),
  sessionEmptyMessage: document.querySelector("#sessionEmptyMessage"),
  historyPeriodButtons: document.querySelectorAll(".history-period-button"),
  historyPlanFilter: document.querySelector("#historyPlanFilter"),
  loadMoreSessionsButton: document.querySelector("#loadMoreSessionsButton"),
  exportDataButton: document.querySelector("#exportDataButton"),
  importDataButton: document.querySelector("#importDataButton"),
  importDataInput: document.querySelector("#importDataInput"),
  clearHistoryButton: document.querySelector("#clearHistoryButton"),
  resetAppButton: document.querySelector("#resetAppButton"),
  dataManagementStatus: document.querySelector("#dataManagementStatus"),
  planDetailsDialog: document.querySelector("#planDetailsDialog"),
  planDetailsTitle: document.querySelector("#planDetailsTitle"),
  planDetailsMeta: document.querySelector("#planDetailsMeta"),
  planDetailsNotes: document.querySelector("#planDetailsNotes"),
  subtaskProgress: document.querySelector("#subtaskProgress"),
  subtaskList: document.querySelector("#subtaskList"),
  subtaskEmptyMessage: document.querySelector("#subtaskEmptyMessage"),
  subtaskForm: document.querySelector("#subtaskForm"),
  subtaskInput: document.querySelector("#subtaskInput"),
  addSubtaskButton: document.querySelector("#addSubtaskButton"),
  closePlanDetailsButton: document.querySelector("#closePlanDetailsButton"),
  editPlanFromDetailsButton: document.querySelector("#editPlanFromDetailsButton"),
  timerPanel: document.querySelector(".timer-panel"),
  timerPlanSelect: document.querySelector("#timerPlanSelect"),
  durationButtons: document.querySelectorAll(".duration-button"),
  customMinutesInput: document.querySelector("#customMinutes"),
  timerDisplay: document.querySelector("#timerDisplay"),
  timerStatus: document.querySelector("#timerStatus"),
  timerPhaseBadge: document.querySelector("#timerPhaseBadge"),
  breakMinutesInput: document.querySelector("#breakMinutes"),
  longBreakMinutesInput: document.querySelector("#longBreakMinutes"),
  timerCycleStatus: document.querySelector("#timerCycleStatus"),
  timerCycleIndicators: document.querySelectorAll(
    "#timerCycleIndicators span"
  ),
  autoStartBreakInput: document.querySelector("#autoStartBreak"),
  autoStartFocusInput: document.querySelector("#autoStartFocus"),
  soundMutedInput: document.querySelector("#soundMuted"),
  soundVolumeInput: document.querySelector("#soundVolume"),
  soundVolumeOutput: document.querySelector("#soundVolumeOutput"),
  soundPreviewSelect: document.querySelector("#soundPreviewSelect"),
  previewSoundButton: document.querySelector("#previewSoundButton"),
  soundPlaybackStatus: document.querySelector("#soundPlaybackStatus"),
  startTimerButton: document.querySelector("#startTimerButton"),
  pauseTimerButton: document.querySelector("#pauseTimerButton"),
  resetTimerButton: document.querySelector("#resetTimerButton"),
  skipBreakButton: document.querySelector("#skipBreakButton")
};

/* ===== Application state ===== */

const state = {
  theme: document.documentElement.dataset.theme,
  activePage: window.NavigationTools.getPageFromHash(
    window.location.hash
  ),
  plans: loadPlans(),
  focusSessions: loadFocusSessions(),
  achievementUnlocks: loadAchievementUnlocks(),
  dailyGoalMinutes: window.GoalTools.loadDailyGoal(localStorage),
  editingPlanId: null,
  viewingPlanId: null,
  planView: {
    searchText: "",
    status: "all",
    sortBy: "created-desc",
    tag: ""
  },
  batchMode: false,
  selectedPlanIds: new Set(),
  achievementToastTimeoutId: null,
  actionFeedback: {
    deletionSnapshot: null,
    timeoutId: null
  },
  historyFilter: {
    period: "today",
    planKey: "",
    visibleCount: SESSION_PAGE_SIZE
  },
  pwa: {
    deferredInstallPrompt: null
  },
  sound: restoredSoundResult.settings,
  timer: {
    phase: restoredTimerResult.timer?.phase || "focus",
    selectedMinutes: restoredTimerResult.timer?.selectedMinutes ||
      DEFAULT_TIMER_MINUTES,
    breakMinutes: restoredTimerResult.timer?.breakMinutes ||
      window.PomodoroTools.DEFAULT_BREAK_MINUTES,
    longBreakMinutes: restoredTimerResult.timer?.longBreakMinutes ||
      window.PomodoroTools.DEFAULT_LONG_BREAK_MINUTES,
    completedFocusesInCycle:
      restoredTimerResult.timer?.completedFocusesInCycle || 0,
    isLongBreak: restoredTimerResult.timer?.isLongBreak || false,
    remainingSeconds: restoredTimerResult.timer?.remainingSeconds ??
      DEFAULT_TIMER_MINUTES * 60,
    selectedPlanId: restoredTimerResult.timer?.selectedPlanId || "",
    isRunning: restoredTimerResult.timer?.isRunning || false,
    intervalId: null,
    endAt: restoredTimerResult.timer?.endAt || null,
    completionRecorded:
      restoredTimerResult.timer?.completionRecorded || false,
    autoStartBreak: restoredTimerResult.timer?.autoStartBreak || false,
    autoStartFocus: restoredTimerResult.timer?.autoStartFocus || false
  }
};

/* ===== Storage ===== */

function loadPlans() {
  return loadStoredArray(STORAGE_KEY, "计划", function (parsedPlans) {
    return parsedPlans
      .filter(function (plan) {
        return plan !== null && typeof plan === "object";
      })
      .map(function (plan, index) {
      const validPriority = Object.hasOwn(PRIORITY_LABELS, plan.priority)
        ? plan.priority
        : "medium";

      return {
        id: plan.id ?? Date.now() + index,
        title: String(plan.title || "未命名计划"),
        tag: typeof plan.tag === "string"
          ? plan.tag.trim().slice(0, 16)
          : "",
        priority: validPriority,
        dueAt: typeof plan.dueAt === "string" ? plan.dueAt : "",
        repeat: window.RecurrenceTools.normalizeRepeat(plan.repeat),
        reminderMinutes: window.ReminderTools.normalizeReminderMinutes(
          plan.reminderMinutes
        ),
        notes: window.TextTools.normalizePlanNotes(plan.notes),
        subtasks: window.SubtaskTools.normalizeSubtasks(plan.subtasks),
        reminded: Boolean(plan.reminded),
        completed: Boolean(plan.completed),
        nextOccurrenceCreated: Boolean(plan.nextOccurrenceCreated),
        generatedFromId: plan.generatedFromId ?? null
      };
    });
  });
}

function savePlans() {
  saveStoredArray(STORAGE_KEY, state.plans);
}

function loadFocusSessions() {
  return loadStoredArray(
    SESSION_STORAGE_KEY,
    "专注记录",
    function (parsedSessions) {
    return parsedSessions
      .filter(function (session) {
        return session !== null && typeof session === "object";
      })
      .map(function (session, index) {
        const plannedMinutes = Number(session.plannedMinutes);
        const actualSeconds = Number(session.actualSeconds);

        return {
          id: session.id ?? Date.now() + index,
          planId: session.planId ?? null,
          planTitle: String(session.planTitle || "自由专注"),
          plannedMinutes: Number.isFinite(plannedMinutes) ? plannedMinutes : 0,
          actualSeconds: Number.isFinite(actualSeconds) ? actualSeconds : 0,
          completedAt: typeof session.completedAt === "string"
            ? session.completedAt
            : new Date().toISOString()
        };
      });
    }
  );
}

function saveFocusSessions() {
  saveStoredArray(SESSION_STORAGE_KEY, state.focusSessions);
}

function loadAchievementUnlocks() {
  return loadStoredArray(
    ACHIEVEMENT_STORAGE_KEY,
    "成就",
    function (parsedUnlocks) {
    return parsedUnlocks.filter(function (unlock) {
      return unlock !== null &&
        typeof unlock === "object" &&
        typeof unlock.id === "string" &&
        typeof unlock.unlockedAt === "string";
    });
    }
  );
}

function saveAchievementUnlocks() {
  saveStoredArray(ACHIEVEMENT_STORAGE_KEY, state.achievementUnlocks);
}

function loadStoredArray(key, label, normalizeItems) {
  const result = window.StorageTools.loadJsonArray(
    localStorage,
    key,
    normalizeItems
  );

  if (result.recovered) {
    console.error("读取" + label + "数据失败：", result.error);
    storageRecoveryLabels.push(label);
  }

  return result.items;
}

function saveStoredArray(key, value) {
  const result = window.StorageTools.saveJson(localStorage, key, value);

  if (!result.ok) {
    console.error("保存本地数据失败：", result.error);
    showDataManagementStatus(
      "保存失败：浏览器本地存储空间可能不足。",
      "error"
    );
  }
}

/* ===== Page navigation ===== */

function renderAppPage(pageName, shouldScroll) {
  const activePage = window.NavigationTools.normalizePage(pageName);

  state.activePage = activePage;
  elements.appPages.forEach(function (page) {
    const isActive = page.dataset.page === activePage;

    page.hidden = !isActive;
    page.classList.toggle("is-active", isActive);
  });
  elements.appTabs.forEach(function (tab) {
    const isActive = tab.dataset.pageTarget === activePage;

    tab.classList.toggle("is-active", isActive);
    tab.setAttribute("aria-selected", String(isActive));
    tab.tabIndex = isActive ? 0 : -1;
  });
  document.title =
    window.NavigationTools.getPageTitle(activePage) + " · Focus Plan";

  if (shouldScroll) {
    window.scrollTo({ top: 0, behavior: "auto" });
  }
}

function navigateToPage(pageName) {
  const normalizedPage = window.NavigationTools.normalizePage(pageName);
  const nextHash = window.NavigationTools.createPageHash(normalizedPage);

  renderAppPage(normalizedPage, true);

  if (window.location.hash === nextHash) {
    return;
  }

  window.location.hash = nextHash;
}

function handlePageHashChange() {
  renderAppPage(
    window.NavigationTools.getPageFromHash(window.location.hash),
    true
  );
}

function handleAppTabKeydown(event) {
  const supportedKeys = ["ArrowLeft", "ArrowRight", "Home", "End"];

  if (!supportedKeys.includes(event.key)) {
    return;
  }

  const tabs = Array.from(elements.appTabs);
  const currentIndex = tabs.indexOf(event.currentTarget);
  let nextIndex = currentIndex;

  if (event.key === "ArrowLeft") {
    nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
  } else if (event.key === "ArrowRight") {
    nextIndex = (currentIndex + 1) % tabs.length;
  } else if (event.key === "Home") {
    nextIndex = 0;
  } else if (event.key === "End") {
    nextIndex = tabs.length - 1;
  }

  event.preventDefault();
  tabs[nextIndex].focus();
  navigateToPage(tabs[nextIndex].dataset.pageTarget);
}

/* ===== PWA installation ===== */

function isAppRunningStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches ||
    Boolean(window.navigator.standalone);
}

function isCurrentDeviceIos() {
  return window.PwaTools.isIosDevice(
    window.navigator.userAgent,
    window.navigator.platform,
    window.navigator.maxTouchPoints
  );
}

function getCurrentInstallState() {
  return window.PwaTools.getInstallState({
    isStandalone: isAppRunningStandalone(),
    hasInstallPrompt: state.pwa.deferredInstallPrompt !== null,
    isIos: isCurrentDeviceIos()
  });
}

function updateInstallControls() {
  const installState = getCurrentInstallState();
  const presentation =
    window.PwaTools.getInstallPresentation(installState);

  elements.installAppStatus.textContent = presentation.statusText;
  elements.installAppButton.hidden = !presentation.buttonVisible;
  elements.installAppButton.textContent = presentation.buttonText;
}

function handleBeforeInstallPrompt(event) {
  event.preventDefault();
  state.pwa.deferredInstallPrompt = event;
  updateInstallControls();
}

function handleAppInstalled() {
  state.pwa.deferredInstallPrompt = null;
  updateInstallControls();
  elements.installAppStatus.textContent = "应用安装成功";
}

async function handleInstallApp() {
  const installState = getCurrentInstallState();

  if (installState === window.PwaTools.INSTALL_STATES.IOS_MANUAL) {
    elements.installAppStatus.textContent =
      "请在 Safari 中点击分享，再选择“添加到主屏幕”";
    return;
  }

  if (state.pwa.deferredInstallPrompt === null) {
    updateInstallControls();
    return;
  }

  const installPrompt = state.pwa.deferredInstallPrompt;

  try {
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;

    state.pwa.deferredInstallPrompt = null;
    updateInstallControls();
    elements.installAppStatus.textContent = choice.outcome === "accepted"
      ? "正在完成安装"
      : "已取消安装";
  } catch (error) {
    console.warn("应用安装请求失败：", error);
    elements.installAppStatus.textContent = "暂时无法安装，请稍后重试";
  }
}

function registerServiceWorker() {
  if (!("serviceWorker" in window.navigator)) {
    elements.offlineAppStatus.textContent = "当前浏览器不支持离线功能";
    return;
  }

  window.addEventListener("load", function () {
    window.navigator.serviceWorker.register("./service-worker.js")
      .then(function () {
        elements.offlineAppStatus.textContent = "离线功能已就绪";
      })
      .catch(function (error) {
        console.warn("离线功能注册失败：", error);
        elements.offlineAppStatus.textContent = "离线功能初始化失败";
      });
  });
}

/* ===== Shared helpers ===== */

function applyTheme(theme, shouldSave) {
  const normalizedTheme = window.ThemeTools.normalizeTheme(theme) ||
    window.ThemeTools.LIGHT_THEME;

  state.theme = normalizedTheme;
  document.documentElement.dataset.theme = normalizedTheme;
  elements.themeToggle.checked =
    normalizedTheme === window.ThemeTools.DARK_THEME;
  elements.themeLabel.textContent = elements.themeToggle.checked
    ? "浅色模式"
    : "深色模式";

  if (shouldSave) {
    const result = window.ThemeTools.saveTheme(localStorage, normalizedTheme);

    if (!result.ok) {
      console.error("保存主题设置失败：", result.error);
      showDataManagementStatus("主题已切换，但未能记住本次选择。", "error");
    }
  }
}

function formatDateTime(dateTimeValue) {
  if (!dateTimeValue) {
    return "未设置时间";
  }

  const date = new Date(dateTimeValue);

  if (Number.isNaN(date.getTime())) {
    return "时间格式无效";
  }

  return date.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function isPlanOverdue(plan) {
  if (!plan.dueAt || plan.completed) {
    return false;
  }

  return new Date(plan.dueAt).getTime() <= Date.now();
}

/* ===== Plan form ===== */

function openCreatePlanForm() {
  state.editingPlanId = null;
  elements.planForm.reset();
  elements.savePlanButton.textContent = "保存计划";
  elements.createPlanButton.textContent = "填写中";
  elements.planForm.hidden = false;
  elements.emptyMessage.hidden = true;
  elements.planTitleInput.focus();
}

function openEditPlanForm(plan) {
  state.editingPlanId = plan.id;
  elements.planTitleInput.value = plan.title;
  elements.planPriorityInput.value = plan.priority;
  elements.planTagInput.value = plan.tag;
  elements.planDueAtInput.value = plan.dueAt;
  elements.planRepeatInput.value = plan.repeat;
  elements.planReminderMinutesInput.value =
    String(plan.reminderMinutes);
  elements.planNotesInput.value = plan.notes;
  elements.savePlanButton.textContent = "保存修改";
  elements.createPlanButton.textContent = "编辑中";
  elements.planForm.hidden = false;
  elements.emptyMessage.hidden = true;
  elements.planTitleInput.focus();
  elements.planTitleInput.select();
}

function closePlanForm() {
  state.editingPlanId = null;
  elements.planForm.reset();
  elements.planForm.hidden = true;
  elements.createPlanButton.textContent = "创建计划";
  elements.savePlanButton.textContent = "保存计划";
  elements.emptyMessage.hidden = state.plans.length > 0;
}

function handlePlanSubmit(event) {
  event.preventDefault();

  const title = elements.planTitleInput.value.trim();
  const priority = elements.planPriorityInput.value;
  const tag = elements.planTagInput.value.trim().slice(0, 16);
  const dueAt = elements.planDueAtInput.value;
  const repeat = window.RecurrenceTools.normalizeRepeat(
    elements.planRepeatInput.value
  );
  const reminderMinutes = window.ReminderTools.normalizeReminderMinutes(
    elements.planReminderMinutesInput.value
  );
  const notes = window.TextTools.normalizePlanNotes(
    elements.planNotesInput.value
  );

  elements.planDueAtInput.setCustomValidity("");

  if (repeat !== "none" && dueAt === "") {
    elements.planDueAtInput.setCustomValidity(
      "重复计划必须设置计划时间。"
    );
    elements.planDueAtInput.reportValidity();
    elements.planDueAtInput.focus();
    return;
  }

  if (title === "") {
    elements.planTitleInput.focus();
    return;
  }

  if (state.editingPlanId === null) {
    state.plans.push({
      id: Date.now(),
      title,
      tag,
      priority,
      dueAt,
      repeat,
      reminderMinutes,
      notes,
      subtasks: [],
      reminded: false,
      completed: false,
      nextOccurrenceCreated: false,
      generatedFromId: null
    });
  } else {
    const editingPlan = state.plans.find(function (plan) {
      return plan.id === state.editingPlanId;
    });

    if (editingPlan !== undefined) {
      editingPlan.title = title;
      editingPlan.tag = tag;
      editingPlan.priority = priority;
      editingPlan.repeat = repeat;

      if (
        editingPlan.dueAt !== dueAt ||
        editingPlan.reminderMinutes !== reminderMinutes
      ) {
        editingPlan.reminded = false;
      }

      editingPlan.dueAt = dueAt;
      editingPlan.reminderMinutes = reminderMinutes;
      editingPlan.notes = notes;
    }
  }

  savePlans();
  renderPlans();
  closePlanForm();
}

/* ===== Plan list ===== */

function updatePlanSummary(visibleCount) {
  const completedCount = state.plans.filter(function (plan) {
    return plan.completed;
  }).length;

  elements.planSummary.textContent =
    state.plans.length + " 项计划 · " +
    completedCount + " 项完成 · 当前显示 " + visibleCount + " 项";
}

function updatePlanViewControls() {
  elements.planStatusButtons.forEach(function (button) {
    const isActive = button.dataset.status === state.planView.status;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

function getVisiblePlans() {
  return window.PlanTools.filterAndSortPlans(state.plans, state.planView);
}

function updatePlanTagOptions() {
  const tags = Array.from(new Set(
    state.plans
      .map(function (plan) {
        return plan.tag;
      })
      .filter(Boolean)
  )).sort(function (firstTag, secondTag) {
    return firstTag.localeCompare(secondTag, "zh-CN");
  });

  if (state.planView.tag && !tags.includes(state.planView.tag)) {
    state.planView.tag = "";
  }

  elements.planTagFilter.innerHTML = "";

  const allTagsOption = document.createElement("option");
  allTagsOption.value = "";
  allTagsOption.textContent = "全部标签";
  elements.planTagFilter.appendChild(allTagsOption);

  tags.forEach(function (tag) {
    const option = document.createElement("option");
    option.value = tag;
    option.textContent = tag;
    elements.planTagFilter.appendChild(option);
  });

  elements.planTagFilter.value = state.planView.tag;
}

function updateBatchControls(visiblePlans) {
  const selectedCount = state.selectedPlanIds.size;
  const visibleSelectedCount = visiblePlans.filter(function (plan) {
    return state.selectedPlanIds.has(plan.id);
  }).length;
  const allVisibleSelected =
    visiblePlans.length > 0 && visibleSelectedCount === visiblePlans.length;

  elements.batchActionBar.hidden = !state.batchMode;
  elements.batchModeButton.textContent = state.batchMode
    ? "管理中"
    : "批量管理";
  elements.batchModeButton.disabled = state.batchMode;
  elements.batchSelectionSummary.textContent =
    "已选择 " + selectedCount + " 项";
  elements.batchSelectAll.checked = allVisibleSelected;
  elements.batchSelectAll.indeterminate =
    visibleSelectedCount > 0 && !allVisibleSelected;
  elements.batchSelectAll.disabled = visiblePlans.length === 0;
  elements.batchCompleteButton.disabled = selectedCount === 0;
  elements.batchDeleteButton.disabled = selectedCount === 0;
}

function setBatchMode(enabled) {
  state.batchMode = enabled;
  state.selectedPlanIds.clear();
  renderPlans();
}

function clearBatchSelectionForViewChange() {
  state.selectedPlanIds.clear();
}

function hideActionFeedback() {
  if (state.actionFeedback.timeoutId !== null) {
    clearTimeout(state.actionFeedback.timeoutId);
  }

  state.actionFeedback.deletionSnapshot = null;
  state.actionFeedback.timeoutId = null;
  elements.actionToast.hidden = true;
}

function showActionFeedback(message, deletionSnapshot) {
  if (state.actionFeedback.timeoutId !== null) {
    clearTimeout(state.actionFeedback.timeoutId);
  }

  state.actionFeedback.deletionSnapshot = deletionSnapshot || null;
  elements.actionToastMessage.textContent = message;
  elements.undoActionButton.hidden = !deletionSnapshot;
  elements.actionToast.hidden = false;

  state.actionFeedback.timeoutId = setTimeout(function () {
    hideActionFeedback();
  }, 6000);
}

function undoLastPlanDeletion() {
  const snapshot = state.actionFeedback.deletionSnapshot;

  if (snapshot === null) {
    return;
  }

  state.plans = window.UndoTools.restoreDeletedPlans(state.plans, snapshot);
  state.selectedPlanIds.clear();
  savePlans();
  renderPlans();
  showActionFeedback("已撤销删除。", null);
}

function updateTimerPlanOptions() {
  const previousSelectedPlanId = state.timer.selectedPlanId;
  const selectedPlanStillExists = state.plans.some(function (plan) {
    return String(plan.id) === state.timer.selectedPlanId;
  });

  if (!selectedPlanStillExists) {
    state.timer.selectedPlanId = "";
  }

  if (
    previousSelectedPlanId &&
    previousSelectedPlanId !== state.timer.selectedPlanId
  ) {
    persistTimerState();
  }

  elements.timerPlanSelect.innerHTML = "";

  const emptyOption = document.createElement("option");
  emptyOption.value = "";
  emptyOption.textContent = "不关联计划";
  elements.timerPlanSelect.appendChild(emptyOption);

  state.plans.forEach(function (plan) {
    const option = document.createElement("option");
    option.value = String(plan.id);
    option.textContent = plan.completed ? plan.title + "（已完成）" : plan.title;
    elements.timerPlanSelect.appendChild(option);
  });

  elements.timerPlanSelect.value = state.timer.selectedPlanId;
}

function createPlanItem(plan) {
  const planItem = document.createElement("li");
  const planContent = document.createElement("label");
  const checkbox = document.createElement("input");
  const planText = document.createElement("div");
  const planTitle = document.createElement("span");
  const planMeta = document.createElement("small");
  const planTag = document.createElement("small");
  const detailsButton = document.createElement("button");
  const editButton = document.createElement("button");
  const deleteButton = document.createElement("button");

  planItem.className = "plan-item priority-" + plan.priority;
  planContent.className = "plan-content";
  planText.className = "plan-text";
  planTitle.className = "plan-title";
  planMeta.className = "plan-meta";
  planTag.className = "plan-tag";

  checkbox.type = "checkbox";
  checkbox.checked = plan.completed;
  planTitle.textContent = plan.title;
  planMeta.textContent =
    "优先级：" + PRIORITY_LABELS[plan.priority] + " · " + formatDateTime(plan.dueAt);
  if (REPEAT_LABELS[plan.repeat]) {
    planMeta.textContent += " · " + REPEAT_LABELS[plan.repeat];
  }
  if (REMINDER_LABELS[plan.reminderMinutes]) {
    planMeta.textContent += " · " +
      REMINDER_LABELS[plan.reminderMinutes];
  }
  const subtaskProgress = window.SubtaskTools.calculateSubtaskProgress(
    plan.subtasks
  );
  if (subtaskProgress.total > 0) {
    planMeta.textContent += " · 子任务 " +
      subtaskProgress.completed + "/" + subtaskProgress.total;
  }
  planTag.textContent = plan.tag;
  planTag.hidden = !plan.tag;

  detailsButton.type = "button";
  detailsButton.className = "details-button";
  detailsButton.textContent = "详情";

  editButton.type = "button";
  editButton.className = "edit-button";
  editButton.textContent = "编辑";

  deleteButton.type = "button";
  deleteButton.className = "delete-button";
  deleteButton.textContent = "删除";

  if (state.batchMode) {
    const selectionCheckbox = document.createElement("input");
    selectionCheckbox.type = "checkbox";
    selectionCheckbox.className = "plan-select-checkbox";
    selectionCheckbox.checked = state.selectedPlanIds.has(plan.id);
    selectionCheckbox.setAttribute(
      "aria-label",
      "选择计划：" + plan.title
    );
    selectionCheckbox.addEventListener("change", function () {
      if (selectionCheckbox.checked) {
        state.selectedPlanIds.add(plan.id);
      } else {
        state.selectedPlanIds.delete(plan.id);
      }

      renderPlans();
    });
    planItem.classList.add("is-selecting");
    planItem.appendChild(selectionCheckbox);
  }

  if (plan.completed) {
    planItem.classList.add("completed");
  } else if (isPlanOverdue(plan)) {
    planItem.classList.add("overdue");
    planMeta.textContent += " · 已逾期";
  }

  checkbox.addEventListener("change", function () {
    const nextPlanCreated = checkbox.checked
      ? completePlanOccurrence(plan)
      : false;

    if (!checkbox.checked) {
      plan.completed = false;
    }

    savePlans();
    renderPlans();

    if (nextPlanCreated) {
      showActionFeedback(
        "本次计划已完成，下一周期计划已生成。",
        null
      );
    }
  });

  editButton.addEventListener("click", function () {
    openEditPlanForm(plan);
  });

  detailsButton.addEventListener("click", function () {
    openPlanDetails(plan);
  });

  deleteButton.addEventListener("click", function () {
    const deletionSnapshot = window.UndoTools.createDeletionSnapshot(
      state.plans,
      new Set([plan.id])
    );

    state.plans = state.plans.filter(function (item) {
      return item.id !== plan.id;
    });
    state.selectedPlanIds.delete(plan.id);

    if (state.editingPlanId === plan.id) {
      closePlanForm();
    }
    if (state.viewingPlanId === plan.id) {
      closePlanDetails();
    }

    savePlans();
    renderPlans();
    showActionFeedback("已删除计划“" + plan.title + "”。", deletionSnapshot);
  });

  planText.appendChild(planTitle);
  planText.appendChild(planMeta);
  planText.appendChild(planTag);
  planContent.appendChild(checkbox);
  planContent.appendChild(planText);
  planItem.appendChild(planContent);
  planItem.appendChild(detailsButton);
  planItem.appendChild(editButton);
  planItem.appendChild(deleteButton);

  return planItem;
}

function openPlanDetails(plan) {
  state.viewingPlanId = plan.id;
  renderPlanDetails(plan);
  elements.planDetailsDialog.showModal();
}

function renderPlanDetails(plan) {
  elements.planDetailsTitle.textContent = plan.title;
  elements.planDetailsMeta.textContent =
    "优先级：" + PRIORITY_LABELS[plan.priority] +
    " · " + formatDateTime(plan.dueAt) +
    (REPEAT_LABELS[plan.repeat] ? " · " + REPEAT_LABELS[plan.repeat] : "");
  elements.planDetailsNotes.textContent =
    plan.notes || "暂无备注。";
  renderSubtasks(plan);
}

function renderSubtasks(plan) {
  const progress = window.SubtaskTools.calculateSubtaskProgress(
    plan.subtasks
  );

  elements.subtaskProgress.textContent =
    progress.completed + " / " + progress.total;
  elements.subtaskList.innerHTML = "";
  elements.subtaskEmptyMessage.hidden = progress.total > 0;
  elements.subtaskInput.disabled =
    progress.total >= window.SubtaskTools.MAX_SUBTASKS;
  elements.addSubtaskButton.disabled =
    progress.total >= window.SubtaskTools.MAX_SUBTASKS;

  plan.subtasks.forEach(function (subtask) {
    const item = document.createElement("li");
    const label = document.createElement("label");
    const checkbox = document.createElement("input");
    const text = document.createElement("span");
    const deleteButton = document.createElement("button");

    item.className = "subtask-item";
    label.className = "subtask-content";
    checkbox.type = "checkbox";
    checkbox.checked = subtask.completed;
    text.textContent = subtask.text;
    deleteButton.type = "button";
    deleteButton.className = "subtask-delete-button";
    deleteButton.textContent = "删除";

    if (subtask.completed) {
      item.classList.add("is-completed");
    }

    checkbox.addEventListener("change", function () {
      plan.subtasks = window.SubtaskTools.toggleSubtask(
        plan.subtasks,
        subtask.id,
        checkbox.checked
      );
      savePlans();
      renderPlanDetails(plan);
      renderPlans();
    });

    deleteButton.addEventListener("click", function () {
      plan.subtasks = window.SubtaskTools.removeSubtask(
        plan.subtasks,
        subtask.id
      );
      savePlans();
      renderPlanDetails(plan);
      renderPlans();
    });

    label.appendChild(checkbox);
    label.appendChild(text);
    item.appendChild(label);
    item.appendChild(deleteButton);
    elements.subtaskList.appendChild(item);
  });
}

function createUniqueSubtaskId(plan) {
  let id = Date.now();

  while (plan.subtasks.some(function (subtask) {
    return subtask.id === id;
  })) {
    id += 1;
  }

  return id;
}

function addSubtask(event) {
  event.preventDefault();

  const plan = state.plans.find(function (item) {
    return item.id === state.viewingPlanId;
  });

  if (!plan || plan.subtasks.length >= window.SubtaskTools.MAX_SUBTASKS) {
    return;
  }

  const subtask = window.SubtaskTools.createSubtask(
    createUniqueSubtaskId(plan),
    elements.subtaskInput.value
  );

  if (subtask === null) {
    elements.subtaskInput.focus();
    return;
  }

  plan.subtasks = plan.subtasks.concat(subtask);
  elements.subtaskForm.reset();
  savePlans();
  renderPlanDetails(plan);
  renderPlans();
  elements.subtaskInput.focus();
}

function closePlanDetails() {
  state.viewingPlanId = null;

  if (elements.planDetailsDialog.open) {
    elements.planDetailsDialog.close();
  }
}

function editPlanFromDetails() {
  const plan = state.plans.find(function (item) {
    return item.id === state.viewingPlanId;
  });

  if (!plan) {
    closePlanDetails();
    return;
  }

  closePlanDetails();
  openEditPlanForm(plan);
}

function renderPlans() {
  updatePlanTagOptions();
  const visiblePlans = getVisiblePlans();

  elements.planList.innerHTML = "";
  elements.emptyMessage.hidden = visiblePlans.length > 0;
  elements.emptyMessage.textContent = state.plans.length === 0
    ? "还没有计划，创建一个试试吧。"
    : "没有符合当前条件的计划。";

  visiblePlans.forEach(function (plan) {
    elements.planList.appendChild(createPlanItem(plan));
  });

  updatePlanSummary(visiblePlans.length);
  updatePlanViewControls();
  updateBatchControls(visiblePlans);
  updateTimerPlanOptions();
}

function completeSelectedPlans() {
  const selectedCount = state.selectedPlanIds.size;
  const selectedPlans = state.plans.filter(function (plan) {
    return state.selectedPlanIds.has(plan.id);
  });
  let generatedCount = 0;

  selectedPlans.forEach(function (plan) {
    if (completePlanOccurrence(plan)) {
      generatedCount += 1;
    }
  });
  state.selectedPlanIds.clear();
  savePlans();
  renderPlans();
  showActionFeedback(
    "已将 " + selectedCount + " 项计划标记为完成。" +
      (generatedCount > 0
        ? " 已生成 " + generatedCount + " 项下一周期计划。"
        : ""),
    null
  );
}

function createUniquePlanId() {
  let id = Date.now();

  while (state.plans.some(function (plan) {
    return plan.id === id;
  })) {
    id += 1;
  }

  return id;
}

function completePlanOccurrence(plan) {
  if (plan.completed) {
    return false;
  }

  plan.completed = true;

  if (plan.repeat === "none" || plan.nextOccurrenceCreated) {
    return false;
  }

  const nextPlan = window.RecurrenceTools.createNextOccurrence(
    plan,
    createUniquePlanId()
  );

  if (nextPlan === null) {
    return false;
  }

  plan.nextOccurrenceCreated = true;
  state.plans.push(nextPlan);
  return true;
}

function deleteSelectedPlans() {
  const selectedCount = state.selectedPlanIds.size;

  if (selectedCount === 0) {
    return;
  }

  const deletionSnapshot = window.UndoTools.createDeletionSnapshot(
    state.plans,
    state.selectedPlanIds
  );

  if (state.selectedPlanIds.has(state.editingPlanId)) {
    closePlanForm();
  }

  state.plans = window.PlanTools.removeSelectedPlans(
    state.plans,
    state.selectedPlanIds
  );
  state.selectedPlanIds.clear();
  savePlans();
  renderPlans();
  showActionFeedback(
    "已删除 " + selectedCount + " 项计划。",
    deletionSnapshot
  );
}

/* ===== Focus history ===== */

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
    const planKey = window.SessionTools.getSessionPlanKey(session);

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

  const filteredSessions = window.SessionTools.filterFocusSessions(
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
  const statistics = window.SessionTools.calculateFocusStatistics(
    state.focusSessions,
    new Date()
  );

  elements.todayFocusTime.textContent = formatFocusDuration(statistics.todaySeconds);
  elements.todaySessionCount.textContent = statistics.todayCount + " 次";
  elements.totalFocusTime.textContent = formatFocusDuration(statistics.totalSeconds);
  elements.longestFocusTime.textContent = formatFocusDuration(statistics.longestSeconds);
  renderDailyGoal();
  renderFocusTrend();
  renderWeeklyComparison();
}

function renderWeeklyComparison() {
  const comparison = window.SessionTools.calculateWeeklyComparison(
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
  const progress = window.GoalTools.calculateDailyGoalProgress(
    state.focusSessions,
    state.dailyGoalMinutes,
    new Date()
  );
  const streak = window.GoalTools.calculateDailyGoalStreak(
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

  const minutes = window.GoalTools.getValidDailyGoalMinutes(
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
  const result = window.GoalTools.saveDailyGoal(localStorage, minutes);

  if (!result.ok) {
    showActionFeedback("每日目标保存失败。", null);
    return;
  }

  state.dailyGoalMinutes = minutes;
  renderDailyGoal();
  showActionFeedback("每日专注目标已保存。", null);
}

function renderFocusTrend() {
  const trend = window.SessionTools.calculateDailyFocusTrend(
    state.focusSessions,
    new Date(),
    7
  );
  const maximumSeconds = trend.reduce(function (maximum, day) {
    return Math.max(maximum, day.totalSeconds);
  }, 0);
  const trendTotalSeconds = trend.reduce(function (total, day) {
    return total + day.totalSeconds;
  }, 0);

  elements.focusTrendChart.innerHTML = "";
  elements.focusTrendSummary.textContent = trendTotalSeconds > 0
    ? "共 " + formatFocusDuration(trendTotalSeconds)
    : "暂无专注记录";
  elements.focusTrendChart.setAttribute(
    "aria-label",
    "最近七天共专注 " + formatFocusDuration(trendTotalSeconds)
  );

  trend.forEach(function (day) {
    const dayItem = document.createElement("div");
    const value = document.createElement("span");
    const track = document.createElement("div");
    const bar = document.createElement("div");
    const weekday = document.createElement("strong");
    const date = document.createElement("small");
    const minutes = Math.round(day.totalSeconds / 60);
    const heightPercent = maximumSeconds > 0
      ? day.totalSeconds / maximumSeconds * 100
      : 0;

    dayItem.className = "focus-trend-day";
    value.className = "focus-trend-value";
    track.className = "focus-trend-track";
    bar.className = "focus-trend-bar";
    weekday.className = "focus-trend-weekday";
    date.className = "focus-trend-date";

    value.textContent = minutes + "分";
    bar.style.height = heightPercent + "%";
    weekday.textContent = day.weekday;
    date.textContent = day.dateLabel;
    dayItem.setAttribute(
      "aria-label",
      day.dateLabel + "，专注 " + minutes + " 分钟"
    );

    track.appendChild(bar);
    dayItem.appendChild(value);
    dayItem.appendChild(track);
    dayItem.appendChild(weekday);
    dayItem.appendChild(date);
    elements.focusTrendChart.appendChild(dayItem);
  });
}

function renderSessionData() {
  renderFocusSessions();
  renderStatistics();
}

/* ===== Achievements ===== */

function formatAchievementDate(unlockedAt) {
  const date = new Date(unlockedAt);

  if (Number.isNaN(date.getTime())) {
    return "已解锁";
  }

  return date.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }) + " 解锁";
}

function showAchievementToast(newAchievements) {
  const achievementNames = newAchievements.map(function (achievement) {
    return achievement.title;
  });

  elements.achievementToast.textContent =
    "解锁成就：" + achievementNames.join("、");
  elements.achievementToast.hidden = false;

  if (state.achievementToastTimeoutId !== null) {
    clearTimeout(state.achievementToastTimeoutId);
  }

  state.achievementToastTimeoutId = setTimeout(function () {
    elements.achievementToast.hidden = true;
    state.achievementToastTimeoutId = null;
  }, 5000);
}

function renderAchievements() {
  elements.achievementList.innerHTML = "";

  ACHIEVEMENTS.forEach(function (achievement) {
    const unlock = state.achievementUnlocks.find(function (item) {
      return item.id === achievement.id;
    });
    const achievementItem = document.createElement("article");
    const mark = document.createElement("span");
    const title = document.createElement("h3");
    const description = document.createElement("p");
    const status = document.createElement("span");

    achievementItem.className = "achievement-item";
    mark.className = "achievement-mark";
    status.className = "achievement-status";
    mark.textContent = achievement.mark;
    title.textContent = achievement.title;
    description.textContent = achievement.description;

    if (unlock) {
      achievementItem.classList.add("is-unlocked");
      status.textContent = formatAchievementDate(unlock.unlockedAt);
    } else {
      status.textContent = "未解锁";
    }

    achievementItem.appendChild(mark);
    achievementItem.appendChild(title);
    achievementItem.appendChild(description);
    achievementItem.appendChild(status);
    elements.achievementList.appendChild(achievementItem);
  });

  elements.achievementSummary.textContent =
    state.achievementUnlocks.length + " / " + ACHIEVEMENTS.length + " 已解锁";
}

function checkAndUnlockAchievements(shouldNotify) {
  const unlockedIds = new Set(state.achievementUnlocks.map(function (unlock) {
    return unlock.id;
  }));
  const newlyUnlocked = [];

  ACHIEVEMENTS.forEach(function (achievement) {
    if (unlockedIds.has(achievement.id)) {
      return;
    }

    if (achievement.isUnlocked(state.focusSessions)) {
      state.achievementUnlocks.push({
        id: achievement.id,
        unlockedAt: new Date().toISOString()
      });
      newlyUnlocked.push(achievement);
    }
  });

  if (newlyUnlocked.length > 0) {
    saveAchievementUnlocks();

    if (shouldNotify) {
      showAchievementToast(newlyUnlocked);
      showNotification(
        "解锁新成就",
        newlyUnlocked.map(function (achievement) {
          return achievement.title;
        }).join("、"),
        "achievement-unlocked"
      );
    }
  }

  renderAchievements();
}

/* ===== Data management ===== */

function showDataManagementStatus(message, type) {
  elements.dataManagementStatus.textContent = message;
  elements.dataManagementStatus.classList.remove("is-success", "is-error");

  if (type) {
    elements.dataManagementStatus.classList.add("is-" + type);
  }
}

function exportApplicationData() {
  const backup = {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    plans: state.plans,
    focusSessions: state.focusSessions,
    achievementUnlocks: state.achievementUnlocks
  };
  const backupText = JSON.stringify(backup, null, 2);
  const backupBlob = new Blob([backupText], { type: "application/json" });
  const downloadUrl = URL.createObjectURL(backupBlob);
  const downloadLink = document.createElement("a");
  const dateText = new Date().toISOString().slice(0, 10);

  downloadLink.href = downloadUrl;
  downloadLink.download = "focus-plan-backup-" + dateText + ".json";
  document.body.appendChild(downloadLink);
  downloadLink.click();
  downloadLink.remove();
  URL.revokeObjectURL(downloadUrl);

  showDataManagementStatus("备份已导出。", "success");
}

function resetHistoryFilter() {
  state.historyFilter.period = "today";
  state.historyFilter.planKey = "";
  state.historyFilter.visibleCount = SESSION_PAGE_SIZE;
}

function applyImportedBackup(backup) {
  resetTimer();
  state.plans = backup.plans;
  state.focusSessions = backup.focusSessions;
  state.achievementUnlocks = backup.achievementUnlocks;
  state.timer.selectedPlanId = "";
  resetHistoryFilter();
  closePlanForm();

  savePlans();
  saveFocusSessions();
  saveAchievementUnlocks();
  renderPlans();
  renderSessionData();
  checkAndUnlockAchievements(false);
  setTimerDuration(DEFAULT_TIMER_MINUTES);
}

async function importApplicationData(event) {
  const file = event.target.files[0];

  if (!file) {
    return;
  }

  try {
    if (file.size > 5 * 1024 * 1024) {
      throw new Error("备份文件不能超过 5 MB");
    }

    const fileText = await file.text();
    const parsedBackup = JSON.parse(fileText);
    const normalizedBackup = window.BackupTools.validateAndNormalizeBackup(
      parsedBackup,
      BACKUP_VALIDATION_OPTIONS
    );
    const confirmed = window.confirm(
      "导入会替换当前计划、专注记录和成就，确定继续吗？"
    );

    if (!confirmed) {
      showDataManagementStatus("已取消导入。", "");
      return;
    }

    applyImportedBackup(normalizedBackup);
    showDataManagementStatus("备份导入成功。", "success");
  } catch (error) {
    console.error("导入备份失败：", error);
    showDataManagementStatus("导入失败：" + error.message, "error");
  } finally {
    elements.importDataInput.value = "";
  }
}

function clearFocusHistory() {
  const confirmed = window.confirm(
    "确定清除全部专注历史吗？已解锁成就会保留。"
  );

  if (!confirmed) {
    return;
  }

  state.focusSessions = [];
  resetHistoryFilter();
  saveFocusSessions();
  renderSessionData();
  showDataManagementStatus("专注历史已清除，成就仍然保留。", "success");
}

function resetApplicationData() {
  const confirmationText = window.prompt(
    "这会清除计划、专注记录和成就。请输入“重置”确认："
  );

  if (confirmationText !== "重置") {
    showDataManagementStatus("未执行完整重置。", "");
    return;
  }

  stopTimerInterval();
  state.plans = [];
  state.focusSessions = [];
  state.achievementUnlocks = [];
  state.timer.phase = "focus";
  state.timer.selectedMinutes = DEFAULT_TIMER_MINUTES;
  state.timer.breakMinutes = window.PomodoroTools.DEFAULT_BREAK_MINUTES;
  state.timer.longBreakMinutes =
    window.PomodoroTools.DEFAULT_LONG_BREAK_MINUTES;
  state.timer.completedFocusesInCycle = 0;
  state.timer.isLongBreak = false;
  state.timer.remainingSeconds = DEFAULT_TIMER_MINUTES * 60;
  state.timer.selectedPlanId = "";
  state.timer.isRunning = false;
  state.timer.endAt = null;
  state.timer.completionRecorded = false;
  state.timer.autoStartBreak = false;
  state.timer.autoStartFocus = false;
  state.sound = { ...window.SoundTools.DEFAULT_SOUND_SETTINGS };
  resetHistoryFilter();
  closePlanForm();

  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(SESSION_STORAGE_KEY);
  localStorage.removeItem(ACHIEVEMENT_STORAGE_KEY);
  localStorage.removeItem(
    window.TimerStateTools.TIMER_STATE_STORAGE_KEY
  );
  localStorage.removeItem(
    window.SoundTools.SOUND_SETTINGS_STORAGE_KEY
  );

  renderPlans();
  renderSessionData();
  renderAchievements();
  elements.customMinutesInput.value = String(DEFAULT_TIMER_MINUTES);
  elements.breakMinutesInput.value = String(
    window.PomodoroTools.DEFAULT_BREAK_MINUTES
  );
  elements.longBreakMinutesInput.value = String(
    window.PomodoroTools.DEFAULT_LONG_BREAK_MINUTES
  );
  elements.autoStartBreakInput.checked = false;
  elements.autoStartFocusInput.checked = false;
  updateSoundControls();
  elements.timerStatus.textContent =
    "准备开始 · " + DEFAULT_TIMER_MINUTES + " 分钟";
  updateDurationButtons();
  updateTimerDisplay();
  showDataManagementStatus("应用数据已全部重置。", "success");
}

/* ===== Notifications and reminders ===== */

function updateNotificationButton() {
  if (!("Notification" in window)) {
    elements.notificationButton.textContent = "不支持提醒";
    elements.notificationButton.disabled = true;
    return;
  }

  if (Notification.permission === "granted") {
    elements.notificationButton.textContent = "提醒已开启";
    elements.notificationButton.disabled = true;
    return;
  }

  if (Notification.permission === "denied") {
    elements.notificationButton.textContent = "提醒已禁用";
    elements.notificationButton.disabled = true;
    return;
  }

  elements.notificationButton.textContent = "开启提醒";
  elements.notificationButton.disabled = false;
}

function showNotification(title, body, tag) {
  if (!("Notification" in window) || Notification.permission !== "granted") {
    return false;
  }

  try {
    new Notification(title, { body, tag });
    return true;
  } catch (error) {
    console.error("发送通知失败：", error);
    return false;
  }
}

function requestNotificationPermission() {
  if (!("Notification" in window)) {
    return;
  }

  Notification.requestPermission().then(function (permission) {
    updateNotificationButton();

    if (permission === "granted") {
      showNotification(
        "计划提醒已开启",
        "计划或专注计时结束后，我们会在这里提醒你。",
        "notifications-enabled"
      );
      checkPlanReminders();
    }
  });
}

function checkPlanReminders() {
  let plansChanged = false;
  const now = Date.now();

  state.plans.forEach(function (plan) {
    if (!window.ReminderTools.isPlanReminderDue(plan, now)) {
      return;
    }

    const notificationSent = showNotification(
      plan.reminderMinutes > 0
        ? "计划即将到期"
        : "计划时间到了",
      plan.title,
      "plan-" + plan.id
    );

    if (notificationSent) {
      plan.reminded = true;
      plansChanged = true;
    }
  });

  if (plansChanged) {
    savePlans();
  }
}

function refreshTimeBasedStates() {
  checkPlanReminders();
  renderPlans();
}

/* ===== Focus timer ===== */

function updateSoundControls() {
  const volumePercent = Math.round(state.sound.volume * 100);

  elements.soundMutedInput.checked = state.sound.muted;
  elements.soundVolumeInput.value = String(volumePercent);
  elements.soundVolumeOutput.value = volumePercent + "%";
  elements.soundVolumeInput.disabled = state.sound.muted;
  elements.soundPreviewSelect.disabled = state.sound.muted;
  elements.previewSoundButton.disabled = state.sound.muted;
}

function setSoundPlaybackStatus(message, statusType) {
  elements.soundPlaybackStatus.textContent = message;
  elements.soundPlaybackStatus.classList.toggle(
    "is-success",
    statusType === "success"
  );
  elements.soundPlaybackStatus.classList.toggle(
    "is-error",
    statusType === "error"
  );
}

function persistSoundSettings() {
  const result = window.SoundTools.saveSoundSettings(
    localStorage,
    state.sound
  );

  if (!result.ok) {
    console.error("保存提示音设置失败：", result.error);
  }
}

function getTimerAudioContext() {
  if (timerAudioContext !== null) {
    return timerAudioContext;
  }

  const AudioContextClass =
    window.AudioContext || window.webkitAudioContext;

  if (!AudioContextClass) {
    return null;
  }

  timerAudioContext = new AudioContextClass();
  return timerAudioContext;
}

async function prepareTimerSounds() {
  const audioContext = getTimerAudioContext();

  if (audioContext === null) {
    throw new Error("当前浏览器不支持 Web Audio API。");
  }

  if (audioContext.state === "suspended") {
    await audioContext.resume();
  }

  return audioContext;
}

function scheduleCanonVoice(
  audioContext,
  destination,
  frequency,
  startAt,
  duration,
  voiceOptions
) {
  const oscillator = audioContext.createOscillator();
  const noteGain = audioContext.createGain();
  const attackEnd = startAt + 0.035;
  const noteEnd = startAt + duration;

  oscillator.type = voiceOptions.waveform;
  oscillator.frequency.setValueAtTime(
    frequency * voiceOptions.frequencyRatio,
    startAt
  );
  noteGain.gain.setValueAtTime(0.0001, startAt);
  noteGain.gain.exponentialRampToValueAtTime(
    voiceOptions.gain,
    attackEnd
  );
  noteGain.gain.exponentialRampToValueAtTime(0.0001, noteEnd);
  oscillator.connect(noteGain);
  noteGain.connect(destination);
  oscillator.start(startAt);
  oscillator.stop(noteEnd + 0.02);
}

function scheduleCanonCue(audioContext, cue) {
  const masterGain = audioContext.createGain();
  const cueStart = audioContext.currentTime + 0.04;

  masterGain.gain.value = state.sound.volume * 0.34;
  masterGain.connect(audioContext.destination);

  cue.notes.forEach(function (note) {
    const noteStart = cueStart + note.start;

    scheduleCanonVoice(
      audioContext,
      masterGain,
      note.frequency,
      noteStart,
      note.duration,
      {
        waveform: "sine",
        frequencyRatio: 1,
        gain: 0.72
      }
    );
    scheduleCanonVoice(
      audioContext,
      masterGain,
      note.frequency,
      noteStart,
      note.duration * 0.82,
      {
        waveform: "triangle",
        frequencyRatio: 2,
        gain: 0.08
      }
    );
  });
}

function warmUpTimerSounds() {
  if (state.sound.muted) {
    return;
  }

  prepareTimerSounds().catch(function (error) {
    console.warn("提示音准备失败：", error);
    setSoundPlaybackStatus("浏览器无法准备提示音", "error");
  });
}

async function playTimerSound(eventName, announcePlayback) {
  if (state.sound.muted) {
    if (announcePlayback) {
      setSoundPlaybackStatus("提示音当前已静音", "");
    }
    return;
  }

  try {
    if (announcePlayback) {
      setSoundPlaybackStatus("正在准备提示音...", "");
    }

    const audioContext = await prepareTimerSounds();
    const cue = window.SoundTools.getSoundCue(eventName);

    if (cue === null) {
      throw new Error("没有找到对应的提示音。");
    }

    scheduleCanonCue(audioContext, cue);

    if (announcePlayback) {
      const eventLabel =
        window.SoundTools.getSoundEventLabel(eventName);
      setSoundPlaybackStatus(
        "正在试听：" + cue.label + " · " + eventLabel,
        "success"
      );
    }
  } catch (error) {
    console.warn("播放提示音失败：", error);
    setSoundPlaybackStatus(
      error.message || "提示音播放失败，请稍后重试",
      "error"
    );
  }
}

function timerHasProgress() {
  const totalSeconds = getCurrentPhaseTotalSeconds();

  return state.timer.remainingSeconds > 0 &&
    state.timer.remainingSeconds < totalSeconds;
}

function getCurrentPhaseTotalSeconds() {
  const activeBreakMinutes = window.PomodoroTools.getBreakDurationMinutes(
    state.timer.isLongBreak,
    state.timer.breakMinutes,
    state.timer.longBreakMinutes
  );

  return window.PomodoroTools.getPhaseDurationSeconds(
    state.timer.phase,
    state.timer.selectedMinutes,
    activeBreakMinutes
  );
}

function updateTimerCycleDisplay() {
  const completed = state.timer.completedFocusesInCycle;

  elements.timerCycleStatus.textContent =
    "本轮 " + completed + " / " +
    window.PomodoroTools.FOCUSES_PER_LONG_BREAK;
  elements.timerCycleIndicators.forEach(function (indicator, index) {
    indicator.classList.toggle("is-completed", index < completed);
  });
}

function persistTimerState() {
  const result = window.TimerStateTools.saveTimerState(
    localStorage,
    state.timer
  );

  if (!result.ok) {
    console.error("保存计时状态失败：", result.error);
  }
}

function updateDurationButtons() {
  elements.durationButtons.forEach(function (button) {
    const buttonMinutes = Number(button.dataset.minutes);
    button.classList.toggle(
      "is-active",
      buttonMinutes === state.timer.selectedMinutes
    );
  });
}

function updateTimerControls() {
  const settingsLocked = state.timer.isRunning || timerHasProgress();
  const totalSeconds = getCurrentPhaseTotalSeconds();
  const isBreak = state.timer.phase === "break";

  elements.timerPanel.classList.toggle("is-running", state.timer.isRunning);
  elements.timerPanel.classList.toggle("is-break", isBreak);
  elements.timerPlanSelect.disabled = settingsLocked || isBreak;
  elements.customMinutesInput.disabled = settingsLocked || isBreak;
  elements.breakMinutesInput.disabled = settingsLocked;
  elements.longBreakMinutesInput.disabled = settingsLocked;
  elements.skipBreakButton.hidden = !isBreak;
  elements.timerPhaseBadge.textContent = isBreak
    ? (state.timer.isLongBreak ? "长休息" : "休息")
    : "专注";
  updateTimerCycleDisplay();

  elements.durationButtons.forEach(function (button) {
    button.disabled = settingsLocked || isBreak;
  });

  elements.startTimerButton.disabled = state.timer.isRunning;
  elements.pauseTimerButton.disabled = !state.timer.isRunning;

  if (state.timer.isRunning) {
    elements.startTimerButton.textContent = "进行中";
  } else if (state.timer.remainingSeconds === 0) {
    elements.startTimerButton.textContent = "再次开始";
  } else if (state.timer.remainingSeconds < totalSeconds) {
    elements.startTimerButton.textContent = "继续";
  } else {
    elements.startTimerButton.textContent = isBreak ? "开始休息" : "开始";
  }
}

function updateTimerDisplay() {
  elements.timerDisplay.textContent =
    window.TimerTools.formatTimer(state.timer.remainingSeconds);
  updateTimerControls();
}

function setTimerDuration(minutes) {
  if (
    state.timer.phase !== "focus" ||
    state.timer.isRunning ||
    timerHasProgress()
  ) {
    return;
  }

  state.timer.selectedMinutes = minutes;
  state.timer.remainingSeconds = minutes * 60;
  state.timer.completionRecorded = false;
  elements.customMinutesInput.value = String(minutes);
  elements.timerStatus.textContent = "准备开始 · " + minutes + " 分钟";
  updateDurationButtons();
  updateTimerDisplay();
  persistTimerState();
}

function stopTimerInterval() {
  if (state.timer.intervalId !== null) {
    clearInterval(state.timer.intervalId);
    state.timer.intervalId = null;
  }
}

function syncRemainingSeconds() {
  if (state.timer.endAt === null) {
    return;
  }

  state.timer.remainingSeconds = window.TimerTools.calculateRemainingSeconds(
    state.timer.endAt,
    Date.now()
  );
}

function recordCompletedFocusSession() {
  const selectedPlan = state.plans.find(function (plan) {
    return String(plan.id) === state.timer.selectedPlanId;
  });

  const focusSession = {
    id: Date.now(),
    planId: selectedPlan ? selectedPlan.id : null,
    planTitle: selectedPlan ? selectedPlan.title : "自由专注",
    plannedMinutes: state.timer.selectedMinutes,
    actualSeconds: state.timer.selectedMinutes * 60,
    completedAt: new Date().toISOString()
  };

  state.focusSessions.push(focusSession);
  saveFocusSessions();
  checkAndUnlockAchievements(true);
  renderSessionData();

  return focusSession;
}

function finishTimer() {
  if (
    state.timer.phase === "focus" &&
    state.timer.completionRecorded
  ) {
    return;
  }

  stopTimerInterval();
  state.timer.isRunning = false;
  state.timer.endAt = null;
  state.timer.remainingSeconds = 0;

  if (state.timer.phase === "focus") {
    state.timer.completionRecorded = true;
    const completedSession = recordCompletedFocusSession();

    showNotification(
      "专注计时完成",
      completedSession.plannedMinutes + " 分钟专注已完成：" +
        completedSession.planTitle,
      "focus-timer-complete"
    );
    playTimerSound("focusComplete");
    state.timer.completedFocusesInCycle += 1;
    const useLongBreak = window.PomodoroTools.shouldUseLongBreak(
      state.timer.completedFocusesInCycle
    );

    if (useLongBreak) {
      state.timer.completedFocusesInCycle = 0;
    }

    prepareBreakPhase(useLongBreak);

    if (state.timer.autoStartBreak) {
      startTimer();
    }
    return;
  }

  const completedBreakSound = state.timer.isLongBreak
    ? "longBreakComplete"
    : "shortBreakComplete";

  showNotification(
    "休息结束",
    "休息完成，可以开始下一轮专注。",
    "focus-break-complete"
  );
  playTimerSound(completedBreakSound);
  prepareFocusPhase("休息完成 · 准备下一轮专注");

  if (state.timer.autoStartFocus) {
    startTimer();
  }
}

function prepareBreakPhase(isLongBreak) {
  stopTimerInterval();
  state.timer.phase = "break";
  state.timer.isLongBreak = Boolean(isLongBreak);
  state.timer.isRunning = false;
  state.timer.endAt = null;
  const breakMinutes = window.PomodoroTools.getBreakDurationMinutes(
    state.timer.isLongBreak,
    state.timer.breakMinutes,
    state.timer.longBreakMinutes
  );
  state.timer.remainingSeconds = breakMinutes * 60;
  elements.timerStatus.textContent =
    "专注完成 · 准备" +
      (state.timer.isLongBreak ? "长休息 " : "休息 ") +
      breakMinutes + " 分钟";
  updateTimerDisplay();
  persistTimerState();
}

function prepareFocusPhase(statusMessage) {
  stopTimerInterval();
  state.timer.phase = "focus";
  state.timer.isLongBreak = false;
  state.timer.isRunning = false;
  state.timer.endAt = null;
  state.timer.remainingSeconds = state.timer.selectedMinutes * 60;
  state.timer.completionRecorded = false;
  elements.timerStatus.textContent = statusMessage ||
    "准备开始 · " + state.timer.selectedMinutes + " 分钟";
  updateTimerDisplay();
  persistTimerState();
}

function tickTimer() {
  syncRemainingSeconds();

  if (state.timer.remainingSeconds === 0) {
    finishTimer();
    return;
  }

  updateTimerDisplay();
}

function startTimer() {
  if (state.timer.isRunning) {
    return;
  }

  warmUpTimerSounds();

  if (state.timer.remainingSeconds === 0) {
    state.timer.remainingSeconds = getCurrentPhaseTotalSeconds();

    if (state.timer.phase === "focus") {
      state.timer.completionRecorded = false;
    }
  }

  state.timer.isRunning = true;
  state.timer.endAt = Date.now() + state.timer.remainingSeconds * 1000;
  elements.timerStatus.textContent = state.timer.phase === "break"
    ? "休息进行中"
    : "专注进行中";
  updateTimerDisplay();
  persistTimerState();
  state.timer.intervalId = setInterval(tickTimer, 250);
}

function pauseTimer() {
  if (!state.timer.isRunning) {
    return;
  }

  syncRemainingSeconds();
  stopTimerInterval();
  state.timer.isRunning = false;
  state.timer.endAt = null;
  elements.timerStatus.textContent =
    "已暂停 · 剩余 " +
      window.TimerTools.formatTimer(state.timer.remainingSeconds);
  updateTimerDisplay();
  persistTimerState();
}

function resetTimer() {
  stopTimerInterval();
  state.timer.isRunning = false;
  state.timer.endAt = null;
  state.timer.remainingSeconds = getCurrentPhaseTotalSeconds();

  if (state.timer.phase === "focus") {
    state.timer.completionRecorded = false;
  }
  elements.timerStatus.textContent =
    (state.timer.phase === "break" ? "准备休息 · " : "准备开始 · ") +
      (state.timer.phase === "break"
        ? window.PomodoroTools.getBreakDurationMinutes(
          state.timer.isLongBreak,
          state.timer.breakMinutes,
          state.timer.longBreakMinutes
        )
        : state.timer.selectedMinutes) +
      " 分钟";
  updateTimerDisplay();
  persistTimerState();
}

function handleCustomMinutesChange() {
  const minutes = window.TimerTools.getValidMinutes(
    elements.customMinutesInput.value,
    MIN_TIMER_MINUTES,
    MAX_TIMER_MINUTES
  );

  if (minutes === null) {
    elements.customMinutesInput.setCustomValidity("请输入 1 到 180 之间的整数");
    elements.customMinutesInput.reportValidity();
    elements.customMinutesInput.value = String(state.timer.selectedMinutes);
    elements.customMinutesInput.setCustomValidity("");
    return;
  }

  setTimerDuration(minutes);
}

function handleBreakMinutesChange() {
  const canUpdateCurrentBreak =
    state.timer.phase === "break" &&
    !state.timer.isLongBreak &&
    !state.timer.isRunning &&
    !timerHasProgress();
  const minutes = window.PomodoroTools.getValidBreakMinutes(
    elements.breakMinutesInput.value
  );

  if (minutes === null) {
    elements.breakMinutesInput.setCustomValidity(
      "请输入 1 到 60 之间的整数。"
    );
    elements.breakMinutesInput.reportValidity();
    elements.breakMinutesInput.value = String(state.timer.breakMinutes);
    elements.breakMinutesInput.setCustomValidity("");
    return;
  }

  state.timer.breakMinutes = minutes;

  if (canUpdateCurrentBreak) {
    state.timer.remainingSeconds = minutes * 60;
    elements.timerStatus.textContent = "准备休息 · " + minutes + " 分钟";
  }

  updateTimerDisplay();
  persistTimerState();
}

function handleLongBreakMinutesChange() {
  const canUpdateCurrentBreak =
    state.timer.phase === "break" &&
    state.timer.isLongBreak &&
    !state.timer.isRunning &&
    !timerHasProgress();
  const minutes = window.PomodoroTools.getValidBreakMinutes(
    elements.longBreakMinutesInput.value
  );

  if (minutes === null) {
    elements.longBreakMinutesInput.setCustomValidity(
      "请输入 1 到 60 之间的整数。"
    );
    elements.longBreakMinutesInput.reportValidity();
    elements.longBreakMinutesInput.value =
      String(state.timer.longBreakMinutes);
    elements.longBreakMinutesInput.setCustomValidity("");
    return;
  }

  state.timer.longBreakMinutes = minutes;

  if (canUpdateCurrentBreak) {
    state.timer.remainingSeconds = minutes * 60;
    elements.timerStatus.textContent =
      "准备长休息 · " + minutes + " 分钟";
  }

  updateTimerDisplay();
  persistTimerState();
}

function skipBreak() {
  if (state.timer.phase !== "break") {
    return;
  }

  prepareFocusPhase("已跳过休息 · 准备下一轮专注");
}

function restoreTimerInterface() {
  elements.customMinutesInput.value = String(state.timer.selectedMinutes);
  elements.breakMinutesInput.value = String(state.timer.breakMinutes);
  elements.longBreakMinutesInput.value =
    String(state.timer.longBreakMinutes);
  elements.autoStartBreakInput.checked = state.timer.autoStartBreak;
  elements.autoStartFocusInput.checked = state.timer.autoStartFocus;
  updateDurationButtons();

  if (restoredTimerResult.expired) {
    finishTimer();
    return;
  }

  if (state.timer.isRunning) {
    elements.timerStatus.textContent = state.timer.phase === "break"
      ? "休息进行中"
      : "专注进行中";
    updateTimerDisplay();
    state.timer.intervalId = setInterval(tickTimer, 250);
    return;
  }

  const phaseMinutes = state.timer.phase === "break"
    ? window.PomodoroTools.getBreakDurationMinutes(
      state.timer.isLongBreak,
      state.timer.breakMinutes,
      state.timer.longBreakMinutes
    )
    : state.timer.selectedMinutes;
  elements.timerStatus.textContent = timerHasProgress()
    ? "已暂停 · 剩余 " +
      window.TimerTools.formatTimer(state.timer.remainingSeconds)
    : (state.timer.phase === "break" ? "准备休息 · " : "准备开始 · ") +
      phaseMinutes + " 分钟";
  updateTimerDisplay();
}

/* ===== Keyboard shortcuts ===== */

function handleApplicationShortcut(event) {
  const action = window.ShortcutTools.getShortcutAction(event);

  if (action === null) {
    return;
  }

  if (action === "create-plan") {
    event.preventDefault();
    navigateToPage("plans");
    openCreatePlanForm();
    return;
  }

  if (action === "focus-search") {
    event.preventDefault();
    navigateToPage("plans");
    elements.planSearchInput.focus();
    elements.planSearchInput.select();
    return;
  }

  if (action === "escape") {
    if (elements.planDetailsDialog.open) {
      closePlanDetails();
    } else if (!elements.planForm.hidden) {
      closePlanForm();
    } else if (state.batchMode) {
      setBatchMode(false);
    } else if (!elements.actionToast.hidden) {
      hideActionFeedback();
    } else {
      return;
    }

    event.preventDefault();
  }
}

/* ===== Event binding and initialization ===== */

function bindEvents() {
  document.addEventListener("keydown", handleApplicationShortcut);
  window.addEventListener("hashchange", handlePageHashChange);
  window.addEventListener(
    "beforeinstallprompt",
    handleBeforeInstallPrompt
  );
  window.addEventListener("appinstalled", handleAppInstalled);
  elements.appTabs.forEach(function (tab) {
    tab.addEventListener("click", function () {
      navigateToPage(tab.dataset.pageTarget);
    });
    tab.addEventListener("keydown", handleAppTabKeydown);
  });
  elements.themeToggle.addEventListener("change", function () {
    applyTheme(
      elements.themeToggle.checked
        ? window.ThemeTools.DARK_THEME
        : window.ThemeTools.LIGHT_THEME,
      true
    );
  });
  elements.notificationButton.addEventListener("click", requestNotificationPermission);
  elements.installAppButton.addEventListener("click", handleInstallApp);
  elements.createPlanButton.addEventListener("click", function () {
    navigateToPage("plans");
    openCreatePlanForm();
  });
  elements.cancelPlanButton.addEventListener("click", closePlanForm);
  elements.planForm.addEventListener("submit", handlePlanSubmit);
  elements.closePlanDetailsButton.addEventListener(
    "click",
    closePlanDetails
  );
  elements.editPlanFromDetailsButton.addEventListener(
    "click",
    editPlanFromDetails
  );
  elements.subtaskForm.addEventListener("submit", addSubtask);
  elements.dailyGoalForm.addEventListener("submit", saveDailyGoalSetting);
  elements.planDetailsDialog.addEventListener("close", function () {
    state.viewingPlanId = null;
  });
  elements.planSearchInput.addEventListener("input", function () {
    state.planView.searchText = elements.planSearchInput.value;
    clearBatchSelectionForViewChange();
    renderPlans();
  });
  elements.planStatusButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      state.planView.status = button.dataset.status;
      clearBatchSelectionForViewChange();
      renderPlans();
    });
  });
  elements.planSortSelect.addEventListener("change", function () {
    state.planView.sortBy = elements.planSortSelect.value;
    clearBatchSelectionForViewChange();
    renderPlans();
  });
  elements.planTagFilter.addEventListener("change", function () {
    state.planView.tag = elements.planTagFilter.value;
    clearBatchSelectionForViewChange();
    renderPlans();
  });
  elements.batchModeButton.addEventListener("click", function () {
    setBatchMode(true);
  });
  elements.batchCancelButton.addEventListener("click", function () {
    setBatchMode(false);
  });
  elements.batchSelectAll.addEventListener("change", function () {
    getVisiblePlans().forEach(function (plan) {
      if (elements.batchSelectAll.checked) {
        state.selectedPlanIds.add(plan.id);
      } else {
        state.selectedPlanIds.delete(plan.id);
      }
    });
    renderPlans();
  });
  elements.batchCompleteButton.addEventListener(
    "click",
    completeSelectedPlans
  );
  elements.batchDeleteButton.addEventListener("click", deleteSelectedPlans);
  elements.undoActionButton.addEventListener("click", undoLastPlanDeletion);

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

  elements.exportDataButton.addEventListener("click", exportApplicationData);
  elements.importDataButton.addEventListener("click", function () {
    elements.importDataInput.click();
  });
  elements.importDataInput.addEventListener("change", importApplicationData);
  elements.clearHistoryButton.addEventListener("click", clearFocusHistory);
  elements.resetAppButton.addEventListener("click", resetApplicationData);

  elements.timerPlanSelect.addEventListener("change", function () {
    state.timer.selectedPlanId = elements.timerPlanSelect.value;
    persistTimerState();
  });

  elements.durationButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      setTimerDuration(Number(button.dataset.minutes));
    });
  });

  elements.customMinutesInput.addEventListener("change", handleCustomMinutesChange);
  elements.breakMinutesInput.addEventListener(
    "change",
    handleBreakMinutesChange
  );
  elements.longBreakMinutesInput.addEventListener(
    "change",
    handleLongBreakMinutesChange
  );
  elements.autoStartBreakInput.addEventListener("change", function () {
    state.timer.autoStartBreak = elements.autoStartBreakInput.checked;
    persistTimerState();
  });
  elements.autoStartFocusInput.addEventListener("change", function () {
    state.timer.autoStartFocus = elements.autoStartFocusInput.checked;
    persistTimerState();
  });
  elements.soundMutedInput.addEventListener("change", function () {
    state.sound.muted = elements.soundMutedInput.checked;
    updateSoundControls();
    persistSoundSettings();

    if (state.sound.muted) {
      setSoundPlaybackStatus("提示音已静音", "");
    } else {
      setSoundPlaybackStatus("提示音已开启", "success");
      warmUpTimerSounds();
    }
  });
  elements.soundVolumeInput.addEventListener("input", function () {
    state.sound.volume = window.SoundTools.normalizeVolume(
      Number(elements.soundVolumeInput.value) / 100
    );
    updateSoundControls();
  });
  elements.soundVolumeInput.addEventListener("change", persistSoundSettings);
  elements.previewSoundButton.addEventListener("click", function () {
    playTimerSound(elements.soundPreviewSelect.value, true);
  });
  elements.startTimerButton.addEventListener("click", startTimer);
  elements.pauseTimerButton.addEventListener("click", pauseTimer);
  elements.resetTimerButton.addEventListener("click", resetTimer);
  elements.skipBreakButton.addEventListener("click", skipBreak);
}

function initializeApp() {
  applyTheme(state.theme, false);
  bindEvents();
  registerServiceWorker();
  updateInstallControls();
  renderAppPage(state.activePage, false);
  const expectedPageHash = window.NavigationTools.createPageHash(
    state.activePage
  );

  if (window.location.hash !== expectedPageHash) {
    window.history.replaceState(null, "", expectedPageHash);
  }
  updateNotificationButton();
  renderPlans();
  renderSessionData();
  checkAndUnlockAchievements(false);
  updateSoundControls();
  setSoundPlaybackStatus(
    state.sound.muted ? "提示音已静音" : "提示音已就绪",
    state.sound.muted ? "" : "success"
  );
  if (restoredTimerResult.timer === null) {
    setTimerDuration(DEFAULT_TIMER_MINUTES);
  } else {
    restoreTimerInterface();
  }
  checkPlanReminders();
  setInterval(refreshTimeBasedStates, REMINDER_CHECK_MS);

  if (storageRecoveryLabels.length > 0) {
    showDataManagementStatus(
      "已清除损坏的本地数据：" + storageRecoveryLabels.join("、") + "。",
      "error"
    );
  }
}

initializeApp();
