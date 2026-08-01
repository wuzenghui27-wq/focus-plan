/* ===== Startup check ===== */

const REQUIRED_MODULES = [
  "SessionTools",
  "StorageTools",
  "TimerTools",
  "ThemeTools",
  "PlanTools",
  "UndoTools",
  "ShortcutTools",
  "RecurrenceTools",
  "ReminderTools",
  "ReminderPresenter",
  "TextTools",
  "SubtaskTools",
  "GoalTools",
  "PomodoroTools",
  "PushReminderTools",
  "TimerStateTools",
  "SoundTools",
  "DictionaryTools",
  "DictionaryApi",
  "NavigationTools",
  "SyncTools",
  "SyncApi",
  "PushApi"
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
const DEFAULT_TIMER_MINUTES = 25;
const MIN_TIMER_MINUTES = 1;
const MAX_TIMER_MINUTES = 180;
const REMINDER_CHECK_MS = 30000;
const SESSION_PAGE_SIZE = 10;
const AUTO_SYNC_DELAY_MS = 1500;
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
  minimumFocusesPerLongBreak:
    window.PomodoroTools.MIN_FOCUSES_PER_LONG_BREAK,
  maximumFocusesPerLongBreak:
    window.PomodoroTools.MAX_FOCUSES_PER_LONG_BREAK,
  defaultFocusesPerLongBreak:
    window.PomodoroTools.DEFAULT_FOCUSES_PER_LONG_BREAK
};
const restoredTimerResult = window.TimerStateTools.loadTimerState(
  localStorage,
  TIMER_STATE_OPTIONS,
  Date.now()
);
const restoredSoundResult = window.SoundTools.loadSoundSettings(localStorage);
let timerAudioContext = null;
let planReminderCheckInProgress = false;

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
  createPlanButtonLabel: document.querySelector("#createPlanButtonLabel"),
  notificationButton: document.querySelector("#notificationButton"),
  pushSubscriptionButton: document.querySelector("#pushSubscriptionButton"),
  testPushButton: document.querySelector("#testPushButton"),
  pushStatus: document.querySelector("#pushStatus"),
  reminderRegion: document.querySelector("#reminderRegion"),
  accountSignedOut: document.querySelector("#accountSignedOut"),
  accountSignedIn: document.querySelector("#accountSignedIn"),
  phoneLoginForm: document.querySelector("#phoneLoginForm"),
  accountPhoneInput: document.querySelector("#accountPhone"),
  accountPhoneCodeInput: document.querySelector("#accountPhoneCode"),
  sendPhoneCodeButton: document.querySelector("#sendPhoneCodeButton"),
  accountSummary: document.querySelector("#accountSummary"),
  accountStatus: document.querySelector("#accountStatus"),
  uploadSyncButton: document.querySelector("#uploadSyncButton"),
  downloadSyncButton: document.querySelector("#downloadSyncButton"),
  signOutButton: document.querySelector("#signOutButton"),
  planForm: document.querySelector("#planForm"),
  planFormBackdrop: document.querySelector("#planFormBackdrop"),
  planFormHeading: document.querySelector("#planFormHeading"),
  planFormError: document.querySelector("#planFormError"),
  closePlanFormButton: document.querySelector("#closePlanFormButton"),
  planTitleInput: document.querySelector("#planTitle"),
  planTitleCount: document.querySelector("#planTitleCount"),
  planPriorityInput: document.querySelector("#planPriority"),
  planTagInput: document.querySelector("#planTag"),
  planDueAtInput: document.querySelector("#planDueAt"),
  planRepeatInput: document.querySelector("#planRepeat"),
  planReminderMinutesInput: document.querySelector("#planReminderMinutes"),
  planNotesInput: document.querySelector("#planNotes"),
  planNotesCount: document.querySelector("#planNotesCount"),
  planQuickTimeButtons: document.querySelectorAll("[data-plan-time-preset]"),
  savePlanButton: document.querySelector("#savePlanButton"),
  cancelPlanButton: document.querySelector("#cancelPlanButton"),
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
  focusCalendarHeading: document.querySelector("#focusCalendarHeading"),
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
  actionToast: document.querySelector("#actionToast"),
  actionToastMessage: document.querySelector("#actionToastMessage"),
  undoActionButton: document.querySelector("#undoActionButton"),
  sessionList: document.querySelector("#sessionList"),
  sessionSummary: document.querySelector("#sessionSummary"),
  sessionEmptyMessage: document.querySelector("#sessionEmptyMessage"),
  historyPeriodButtons: document.querySelectorAll(".history-period-button"),
  historyPlanFilter: document.querySelector("#historyPlanFilter"),
  loadMoreSessionsButton: document.querySelector("#loadMoreSessionsButton"),
  clearHistoryButton: document.querySelector("#clearHistoryButton"),
  resetAppButton: document.querySelector("#resetAppButton"),
  dataManagementStatus: document.querySelector("#dataManagementStatus"),
  dictionaryForm: document.querySelector("#dictionaryForm"),
  dictionaryQueryInput: document.querySelector("#dictionaryQuery"),
  dictionaryDirection: document.querySelector("#dictionaryDirection"),
  dictionarySubmitButton: document.querySelector("#dictionarySubmitButton"),
  dictionaryStatus: document.querySelector("#dictionaryStatus"),
  dictionaryResult: document.querySelector("#dictionaryResult"),
  dictionaryHeadword: document.querySelector("#dictionaryHeadword"),
  dictionaryPhonetic: document.querySelector("#dictionaryPhonetic"),
  dictionaryResultDirection:
    document.querySelector("#dictionaryResultDirection"),
  dictionaryEntries: document.querySelector("#dictionaryEntries"),
  dictionaryProvider: document.querySelector("#dictionaryProvider"),
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
  postponePlanDialog: document.querySelector("#postponePlanDialog"),
  postponePlanForm: document.querySelector("#postponePlanForm"),
  postponePlanTitle: document.querySelector("#postponePlanTitle"),
  postponePlanDueAtInput: document.querySelector("#postponePlanDueAt"),
  postponePlanReasonInput: document.querySelector("#postponePlanReason"),
  postponePlanReasonCount: document.querySelector("#postponePlanReasonCount"),
  postponePlanError: document.querySelector("#postponePlanError"),
  closePostponePlanButton:
    document.querySelector("#closePostponePlanButton"),
  cancelPostponePlanButton:
    document.querySelector("#cancelPostponePlanButton"),
  timerPanel: document.querySelector(".timer-panel"),
  timerPlanSelect: document.querySelector("#timerPlanSelect"),
  durationButtons: document.querySelectorAll(".duration-button"),
  customMinutesInput: document.querySelector("#customMinutes"),
  timerDisplay: document.querySelector("#timerDisplay"),
  timerStatus: document.querySelector("#timerStatus"),
  timerPhaseBadge: document.querySelector("#timerPhaseBadge"),
  breakMinutesInput: document.querySelector("#breakMinutes"),
  longBreakMinutesInput: document.querySelector("#longBreakMinutes"),
  focusesPerLongBreakInput: document.querySelector("#focusesPerLongBreak"),
  timerCycleStatus: document.querySelector("#timerCycleStatus"),
  timerCycleHint: document.querySelector("#timerCycleHint"),
  timerCycleIndicators: document.querySelector("#timerCycleIndicators"),
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
  dailyGoalMinutes: window.GoalTools.loadDailyGoal(localStorage),
  account: null,
  sync: {
    metadata: window.SyncTools.loadSyncMetadata(localStorage),
    timeoutId: null,
    isSyncing: false,
    isApplyingRemote: false,
    hasConflict: false
  },
  editingPlanId: null,
  viewingPlanId: null,
  postponingPlanId: null,
  batchMode: false,
  selectedPlanIds: new Set(),
  actionFeedback: {
    deletionSnapshot: null,
    timeoutId: null
  },
  historyFilter: {
    period: "today",
    planKey: "",
    visibleCount: SESSION_PAGE_SIZE
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
    focusesPerLongBreak:
      restoredTimerResult.timer?.focusesPerLongBreak ||
      window.PomodoroTools.DEFAULT_FOCUSES_PER_LONG_BREAK,
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
const syncApi = window.SyncApi.createSyncApi(
  window.fetch.bind(window),
  "/api"
);
const pushApi = window.PushApi.createPushApi(
  window.fetch.bind(window),
  "/api"
);
const dictionaryApi = window.DictionaryApi.createDictionaryApi(
  window.fetch.bind(window),
  "/api"
);
let activePushSubscription = null;
let pushPublicKey = "";
let pushBusy = false;
let pushReminderSyncTimer = null;
const reminderPresenter = window.ReminderPresenter.createPresenter(
  elements.reminderRegion,
  {
    displayDuration: 8000,
    maximumVisible: 3,
    onActivate: activateReminder,
    onSnooze: snoozePlanReminder
  }
);

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
        snoozedUntil: window.ReminderTools.normalizeSnoozedUntil(
          plan.snoozedUntil
        ),
        postponedFrom: typeof plan.postponedFrom === "string"
          ? plan.postponedFrom
          : "",
        postponeReason: window.PlanTools.normalizePostponeReason(
          plan.postponeReason
        ).slice(0, window.PlanTools.POSTPONE_REASON_MAX_LENGTH),
        postponedAt: typeof plan.postponedAt === "string"
          ? plan.postponedAt
          : null,
        completed: Boolean(plan.completed),
        nextOccurrenceCreated: Boolean(plan.nextOccurrenceCreated),
        generatedFromId: plan.generatedFromId ?? null
      };
    });
  });
}

function savePlans() {
  saveStoredArray(STORAGE_KEY, state.plans);
  markLocalDataChanged();
  schedulePushReminderSync();
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
  markLocalDataChanged();
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

  if (activePage !== "plans" && !elements.planForm.hidden) {
    closePlanForm();
  }

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
    window.NavigationTools.getPageTitle(activePage) + " · FanP";

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

/* ===== Dictionary ===== */

const PART_OF_SPEECH_LABELS = {
  adjective: "形容词",
  adverb: "副词",
  conjunction: "连词",
  interjection: "感叹词",
  noun: "名词",
  preposition: "介词",
  pronoun: "代词",
  verb: "动词"
};

function getPartOfSpeechLabel(value) {
  const partOfSpeech = String(value || "").trim();
  const normalized = partOfSpeech.toLowerCase();
  const chineseLabel = PART_OF_SPEECH_LABELS[normalized];

  return chineseLabel
    ? chineseLabel + " · " + normalized
    : (partOfSpeech || "释义");
}

function updateDictionaryDirection() {
  const query = window.DictionaryTools.normalizeQuery(
    elements.dictionaryQueryInput.value
  );

  elements.dictionaryDirection.textContent = query === ""
    ? "自动识别"
    : (window.DictionaryTools.detectDirection(query) === "zh-en"
      ? "中 → 英"
      : "英 → 中");
}

function handleDictionaryQueryInput() {
  updateDictionaryDirection();
  elements.dictionaryResult.hidden = true;
  setDictionaryStatus("", "");
}

function setDictionaryStatus(message, type) {
  elements.dictionaryStatus.textContent = message;
  elements.dictionaryStatus.dataset.type = type || "";
}

function createDictionaryMeaning(meaning) {
  const item = document.createElement("div");
  const content = document.createElement("div");

  item.className = "dictionary-meaning";
  content.className = "dictionary-meaning-content";

  if (meaning.english) {
    const field = document.createElement("div");
    const label = document.createElement("span");
    const english = document.createElement("p");
    field.className = "dictionary-result-field";
    label.className = "dictionary-field-label";
    label.textContent = "英英释义";
    english.className = "dictionary-meaning-english";
    english.textContent = meaning.english;
    field.appendChild(label);
    field.appendChild(english);
    content.appendChild(field);
  }
  if (meaning.chinese) {
    const field = document.createElement("div");
    const label = document.createElement("span");
    const chinese = document.createElement("p");
    field.className = "dictionary-result-field";
    label.className = "dictionary-field-label";
    label.textContent = "中文意思";
    chinese.className = "dictionary-meaning-chinese";
    chinese.textContent = meaning.chinese;
    field.appendChild(label);
    field.appendChild(chinese);
    content.appendChild(field);
  }
  if (meaning.example) {
    const field = document.createElement("div");
    const label = document.createElement("span");
    const example = document.createElement("p");
    field.className = "dictionary-result-field";
    label.className = "dictionary-field-label";
    label.textContent = "英文例句";
    example.className = "dictionary-example";
    example.textContent = meaning.example;
    field.appendChild(label);
    field.appendChild(example);
    content.appendChild(field);
  }

  item.appendChild(content);
  return item;
}

function renderDictionaryResult(rawResult) {
  const result = window.DictionaryTools.normalizeLookupResult(rawResult);

  elements.dictionaryHeadword.textContent = result.headword;
  elements.dictionaryPhonetic.textContent = result.phonetic
    ? "/" + result.phonetic.replace(/^\/+|\/+$/g, "") + "/"
    : "";
  elements.dictionaryPhonetic.hidden = !result.phonetic;
  elements.dictionaryResultDirection.textContent = result.direction === "zh-en"
    ? "中 → 英"
    : "英 → 中";
  elements.dictionaryEntries.innerHTML = "";

  result.entries.forEach(function (entry) {
    const section = document.createElement("section");
    const heading = document.createElement("h4");

    section.className = "dictionary-entry";
    heading.textContent = getPartOfSpeechLabel(entry.partOfSpeech);
    section.appendChild(heading);
    entry.meanings.forEach(function (meaning) {
      section.appendChild(createDictionaryMeaning(meaning));
    });
    elements.dictionaryEntries.appendChild(section);
  });

  elements.dictionaryProvider.textContent = "内容来源：" + result.provider;
  elements.dictionaryResult.hidden = false;
}

async function handleDictionarySubmit(event) {
  event.preventDefault();
  const validation = window.DictionaryTools.validateQuery(
    elements.dictionaryQueryInput.value
  );

  if (!validation.valid) {
    elements.dictionaryResult.hidden = true;
    setDictionaryStatus(validation.message, "error");
    elements.dictionaryQueryInput.focus();
    return;
  }

  elements.dictionarySubmitButton.disabled = true;
  elements.dictionarySubmitButton.textContent = "查询中";
  elements.dictionaryResult.hidden = true;
  setDictionaryStatus("正在查询…", "loading");

  try {
    const result = await dictionaryApi.lookup(validation.value);
    renderDictionaryResult(result);
    setDictionaryStatus("", "");
  } catch (error) {
    setDictionaryStatus(error.message, "error");
  } finally {
    elements.dictionarySubmitButton.disabled = false;
    elements.dictionarySubmitButton.textContent = "查询";
  }
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

/* ===== Offline support ===== */

function registerServiceWorker() {
  if (!("serviceWorker" in window.navigator)) {
    return;
  }

  window.addEventListener("load", function () {
    window.navigator.serviceWorker.register("./service-worker.js")
      .then(function (registration) {
        return registration.update();
      })
      .catch(function (error) {
        console.warn("离线功能注册失败：", error);
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

function updatePlanCharacterCount(input, output, maximum) {
  const count = window.PlanFormTools.getCharacterCount(
    input.value,
    maximum
  );

  output.textContent = count.label;
  output.classList.toggle("is-near-limit", count.nearLimit);
}

function updatePlanFormCounters() {
  updatePlanCharacterCount(
    elements.planTitleInput,
    elements.planTitleCount,
    window.PlanFormTools.TITLE_MAX_LENGTH
  );
  updatePlanCharacterCount(
    elements.planNotesInput,
    elements.planNotesCount,
    window.PlanFormTools.NOTES_MAX_LENGTH
  );
}

function clearPlanFormError() {
  elements.planFormError.hidden = true;
  elements.planFormError.textContent = "";
  elements.planTitleInput.removeAttribute("aria-invalid");
  elements.planDueAtInput.removeAttribute("aria-invalid");
}

function showPlanFormError(validation) {
  const field = validation.field === "dueAt"
    ? elements.planDueAtInput
    : elements.planTitleInput;

  clearPlanFormError();
  elements.planFormError.textContent = validation.message;
  elements.planFormError.hidden = false;
  field.setAttribute("aria-invalid", "true");
  field.focus();
}

function updatePlanTimeControls() {
  const hasDueAt = elements.planDueAtInput.value !== "";
  elements.planReminderMinutesInput.disabled = !hasDueAt;

  if (!hasDueAt) {
    elements.planReminderMinutesInput.value = "0";
  }
}

function showPlanForm(mode) {
  const isEditing = mode === "edit";
  elements.planFormHeading.textContent = isEditing
    ? "编辑计划"
    : "创建计划";
  elements.savePlanButton.textContent = isEditing
    ? "保存修改"
    : "保存计划";
  elements.createPlanButtonLabel.textContent = isEditing
    ? "编辑中"
    : "填写中";
  elements.createPlanButton.disabled = true;
  elements.planForm.hidden = false;
  elements.planFormBackdrop.hidden = false;
  elements.emptyMessage.hidden = true;
  document.body.classList.add("plan-form-open");
  updatePlanFormCounters();
  updatePlanTimeControls();
  clearPlanFormError();
}

function openCreatePlanForm() {
  state.editingPlanId = null;
  elements.planForm.reset();
  showPlanForm("create");
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
  showPlanForm("edit");
  elements.planTitleInput.focus();
  elements.planTitleInput.select();
}

function closePlanForm() {
  state.editingPlanId = null;
  elements.planForm.reset();
  elements.planForm.hidden = true;
  elements.planFormBackdrop.hidden = true;
  elements.createPlanButtonLabel.textContent = "创建计划";
  elements.createPlanButton.disabled = false;
  elements.savePlanButton.textContent = "保存计划";
  elements.planFormHeading.textContent = "创建计划";
  document.body.classList.remove("plan-form-open");
  clearPlanFormError();
  updatePlanFormCounters();
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

  const validation = window.PlanFormTools.validatePlanDraft({
    title,
    dueAt,
    repeat
  });

  if (!validation.valid) {
    showPlanFormError(validation);
    return;
  }

  clearPlanFormError();

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
      snoozedUntil: null,
      postponedFrom: "",
      postponeReason: "",
      postponedAt: null,
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
        editingPlan.snoozedUntil = null;
      }

      if (editingPlan.dueAt !== dueAt) {
        editingPlan.postponedFrom = "";
        editingPlan.postponeReason = "";
        editingPlan.postponedAt = null;
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

function updatePlanSummary() {
  const completedCount = state.plans.filter(function (plan) {
    return plan.completed;
  }).length;
  const pendingCount = state.plans.length - completedCount;

  elements.planSummary.textContent =
    pendingCount + " 项待完成 · " + completedCount + " 项已完成";
}

function getVisiblePlans() {
  return window.PlanTools.sortPlansForDisplay(state.plans);
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

function createPlanActionButton(className, label, iconMarkup) {
  const button = document.createElement("button");

  button.type = "button";
  button.className = "plan-action-button " + className;
  button.setAttribute("aria-label", label);
  button.title = label;
  button.innerHTML =
    '<svg class="plan-action-icon" viewBox="0 0 24 24" aria-hidden="true">' +
    iconMarkup +
    "</svg>";

  return button;
}

function createPlanItem(plan) {
  const planItem = document.createElement("li");
  const planContent = document.createElement("label");
  const checkbox = document.createElement("input");
  const planText = document.createElement("div");
  const planHeading = document.createElement("div");
  const planTitle = document.createElement("span");
  const planStatus = document.createElement("span");
  const planMeta = document.createElement("small");
  const planTag = document.createElement("small");
  const postponeNote = document.createElement("small");
  const planActions = document.createElement("div");
  const detailsButton = createPlanActionButton(
    "details-button",
    "查看详情：" + plan.title,
    '<path d="M2.1 12s3.6-6 9.9-6 9.9 6 9.9 6-3.6 6-9.9 6-9.9-6-9.9-6Z"></path>' +
      '<circle cx="12" cy="12" r="2.5"></circle>'
  );
  const editButton = createPlanActionButton(
    "edit-button",
    "编辑计划：" + plan.title,
    '<path d="M12 20h9"></path>' +
      '<path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"></path>'
  );
  const postponeButton = createPlanActionButton(
    "postpone-button",
    "延期计划：" + plan.title,
    '<path d="M8 2v3M16 2v3M3 9h18"></path>' +
      '<path d="M19 13V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h7"></path>' +
      '<circle cx="17" cy="17" r="4"></circle>' +
      '<path d="M17 15v2l1.3 1"></path>'
  );
  const deleteButton = createPlanActionButton(
    "delete-button",
    "删除计划：" + plan.title,
    '<path d="M3 6h18M8 6V4h8v2M19 6l-1 15H6L5 6"></path>' +
      '<path d="M10 11v5M14 11v5"></path>'
  );

  planItem.className = "plan-item priority-" + plan.priority;
  planContent.className = "plan-content";
  planText.className = "plan-text";
  planHeading.className = "plan-item-heading";
  planTitle.className = "plan-title";
  planStatus.className = "plan-state";
  planMeta.className = "plan-meta";
  planTag.className = "plan-tag";
  postponeNote.className = "plan-postpone-note";
  planActions.className = "plan-actions";

  checkbox.type = "checkbox";
  checkbox.className = "plan-completion-checkbox";
  checkbox.checked = plan.completed;
  checkbox.setAttribute(
    "aria-label",
    (plan.completed ? "取消完成：" : "标记完成：") + plan.title
  );
  planTitle.textContent = plan.title;
  planStatus.textContent = plan.completed ? "已完成" : "待完成";
  planStatus.classList.add(plan.completed ? "is-completed" : "is-pending");
  planMeta.textContent =
    formatDateTime(plan.dueAt) + " · " + PRIORITY_LABELS[plan.priority] + "优先级";
  if (REPEAT_LABELS[plan.repeat]) {
    planMeta.textContent += " · " + REPEAT_LABELS[plan.repeat];
  }
  if (REMINDER_LABELS[plan.reminderMinutes]) {
    planMeta.textContent += " · " +
      REMINDER_LABELS[plan.reminderMinutes];
  }
  if (!plan.reminded && plan.snoozedUntil !== null) {
    planMeta.textContent += " · 稍后提醒至 " +
      formatDateTime(plan.snoozedUntil);
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
  postponeNote.textContent = plan.postponeReason
    ? "延期：" + plan.postponeReason
    : "";
  postponeNote.hidden = !plan.postponeReason;

  postponeButton.hidden = plan.completed;

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

  postponeButton.addEventListener("click", function () {
    openPostponePlanDialog(plan);
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
    if (state.postponingPlanId === plan.id) {
      closePostponePlanDialog();
    }

    savePlans();
    renderPlans();
    showActionFeedback("已删除计划“" + plan.title + "”。", deletionSnapshot);
  });

  planHeading.appendChild(planTitle);
  planHeading.appendChild(planStatus);
  planText.appendChild(planHeading);
  planText.appendChild(planMeta);
  planText.appendChild(planTag);
  planText.appendChild(postponeNote);
  planContent.appendChild(checkbox);
  planContent.appendChild(planText);
  planItem.appendChild(planContent);
  planActions.appendChild(detailsButton);
  planActions.appendChild(editButton);
  planActions.appendChild(postponeButton);
  planActions.appendChild(deleteButton);
  planItem.appendChild(planActions);

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
    (REPEAT_LABELS[plan.repeat] ? " · " + REPEAT_LABELS[plan.repeat] : "") +
    (plan.postponeReason ? " · 延期：" + plan.postponeReason : "");
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

function updatePostponeReasonCount() {
  const count = Array.from(elements.postponePlanReasonInput.value).length;

  elements.postponePlanReasonCount.textContent =
    count + " / " + window.PlanTools.POSTPONE_REASON_MAX_LENGTH;
}

function clearPostponePlanError() {
  elements.postponePlanError.hidden = true;
  elements.postponePlanError.textContent = "";
  elements.postponePlanDueAtInput.removeAttribute("aria-invalid");
  elements.postponePlanReasonInput.removeAttribute("aria-invalid");
}

function getDefaultPostponeDueAt(plan) {
  const now = new Date();
  const currentDueAt = new Date(plan.dueAt);
  const baseDate = !Number.isNaN(currentDueAt.getTime()) && currentDueAt > now
    ? currentDueAt
    : now;

  baseDate.setDate(baseDate.getDate() + 1);
  return window.RecurrenceTools.formatLocalDateTime(baseDate);
}

function openPostponePlanDialog(plan) {
  if (plan.completed) {
    return;
  }

  state.postponingPlanId = plan.id;
  elements.postponePlanForm.reset();
  elements.postponePlanTitle.textContent = plan.title;
  elements.postponePlanDueAtInput.value = getDefaultPostponeDueAt(plan);
  elements.postponePlanReasonInput.value = "";
  updatePostponeReasonCount();
  clearPostponePlanError();
  elements.postponePlanDialog.showModal();
  elements.postponePlanReasonInput.focus();
}

function closePostponePlanDialog() {
  state.postponingPlanId = null;
  elements.postponePlanForm.reset();
  updatePostponeReasonCount();
  clearPostponePlanError();

  if (elements.postponePlanDialog.open) {
    elements.postponePlanDialog.close();
  }
}

function handlePostponePlanSubmit(event) {
  event.preventDefault();
  const plan = state.plans.find(function (item) {
    return item.id === state.postponingPlanId;
  });

  if (!plan) {
    closePostponePlanDialog();
    return;
  }

  const validation = window.PlanTools.validatePostponement(plan, {
    newDueAt: elements.postponePlanDueAtInput.value,
    reason: elements.postponePlanReasonInput.value
  }, Date.now());

  if (!validation.valid) {
    const field = validation.field === "reason"
      ? elements.postponePlanReasonInput
      : elements.postponePlanDueAtInput;

    elements.postponePlanError.textContent = validation.message;
    elements.postponePlanError.hidden = false;
    field.setAttribute("aria-invalid", "true");
    field.focus();
    return;
  }

  plan.postponedFrom = plan.dueAt;
  plan.dueAt = validation.value.newDueAt;
  plan.postponeReason = validation.value.reason;
  plan.postponedAt = new Date().toISOString();
  plan.reminded = false;
  plan.snoozedUntil = null;
  savePlans();
  renderPlans();
  closePostponePlanDialog();
  showActionFeedback("计划已延期：" + validation.value.reason, null);
}

function renderPlans() {
  const visiblePlans = getVisiblePlans();

  elements.planList.innerHTML = "";
  elements.emptyMessage.hidden = visiblePlans.length > 0;
  elements.emptyMessage.textContent = "还没有计划，创建一个试试吧。";

  visiblePlans.forEach(function (plan) {
    elements.planList.appendChild(createPlanItem(plan));
  });

  updatePlanSummary();
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
  if (state.selectedPlanIds.has(state.viewingPlanId)) {
    closePlanDetails();
  }
  if (state.selectedPlanIds.has(state.postponingPlanId)) {
    closePostponePlanDialog();
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
  renderFocusCalendar();
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
  markLocalDataChanged();
  renderDailyGoal();
  showActionFeedback("每日专注目标已保存。", null);
}

function renderFocusCalendar() {
  const calendar = window.SessionTools.calculateMonthlyFocusCalendar(
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

/* ===== Data management ===== */

function persistSyncMetadata() {
  window.SyncTools.saveSyncMetadata(localStorage, state.sync.metadata);
}

function hasSyncableLocalData() {
  return state.plans.length > 0 ||
    state.focusSessions.length > 0 ||
    state.dailyGoalMinutes !== window.GoalTools.DEFAULT_DAILY_GOAL_MINUTES;
}

function prepareSyncMetadataForAccount() {
  if (state.sync.metadata.accountId === state.account.id) {
    return;
  }

  state.sync.metadata = window.SyncTools.createSyncMetadata(state.account.id);
  if (hasSyncableLocalData()) {
    state.sync.metadata.localUpdatedAt = new Date().toISOString();
  }
  persistSyncMetadata();
}

function scheduleAutoSync() {
  window.clearTimeout(state.sync.timeoutId);

  if (!state.account || state.sync.hasConflict) {
    return;
  }

  state.sync.timeoutId = window.setTimeout(
    reconcileCloudData,
    AUTO_SYNC_DELAY_MS
  );
}

function markLocalDataChanged() {
  if (state.sync.isApplyingRemote) {
    return;
  }

  state.sync.metadata.localUpdatedAt = new Date().toISOString();
  persistSyncMetadata();

  if (state.account) {
    showAccountStatus("本机有新修改，等待自动同步…", "");
    scheduleAutoSync();
  }
}

function markSyncCompleted(snapshot) {
  const pendingLocalUpdatedAt = state.sync.metadata.localUpdatedAt;
  const hasNewerLocalChanges = pendingLocalUpdatedAt &&
    new Date(pendingLocalUpdatedAt).getTime() >
      new Date(snapshot.updatedAt).getTime();

  state.sync.metadata.localUpdatedAt = hasNewerLocalChanges
    ? pendingLocalUpdatedAt
    : snapshot.updatedAt;
  state.sync.metadata.lastSyncedLocalUpdatedAt = snapshot.updatedAt;
  state.sync.metadata.lastSyncedRemoteUpdatedAt = snapshot.updatedAt;
  state.sync.hasConflict = false;
  persistSyncMetadata();

  if (hasNewerLocalChanges) {
    scheduleAutoSync();
  }
}

async function reconcileCloudData() {
  if (!state.account || state.sync.isSyncing || state.sync.hasConflict) {
    return;
  }

  state.sync.isSyncing = true;
  showAccountStatus("正在自动同步…", "");

  try {
    const result = await syncApi.downloadSnapshot();
    const remoteSnapshot = result.snapshot;
    const action = window.SyncTools.decideSyncAction(
      state.sync.metadata,
      remoteSnapshot?.updatedAt || null
    );

    if (action === "conflict") {
      state.sync.hasConflict = true;
      showAccountStatus(
        "本机和云端都有新修改。请选择上传本机数据或下载云端数据。",
        "error"
      );
    } else if (action === "download") {
      applySyncSnapshot(remoteSnapshot);
      markSyncCompleted(remoteSnapshot);
      showAccountStatus("已自动下载云端最新数据。", "success");
    } else if (action === "upload") {
      const snapshot = createCurrentSyncSnapshot();
      await syncApi.uploadSnapshot(
        snapshot,
        remoteSnapshot?.updatedAt || null
      );
      markSyncCompleted(snapshot);
      showAccountStatus("已自动同步。", "success");
    } else {
      showAccountStatus("数据已是最新。", "success");
    }
  } catch (error) {
    if (error.status === 409) {
      state.sync.hasConflict = true;
    }
    showAccountStatus(error.message, "error");
  } finally {
    state.sync.isSyncing = false;
  }
}

function showAccountStatus(message, type) {
  elements.accountStatus.textContent = message;
  elements.accountStatus.classList.remove("is-success", "is-error");
  if (type) {
    elements.accountStatus.classList.add("is-" + type);
  }
}

function renderAccount() {
  const isSignedIn = state.account !== null;
  elements.accountSignedOut.hidden = isSignedIn;
  elements.accountSignedIn.hidden = !isSignedIn;
  elements.accountSummary.textContent = isSignedIn
    ? "已登录：" + state.account.phone
    : "";
}

async function refreshAccount() {
  try {
    const result = await syncApi.getAccount();
    state.account = result.account;
    renderAccount();
    if (state.account) {
      prepareSyncMetadataForAccount();
      reconcileCloudData();
    }
  } catch (error) {
    showAccountStatus("暂时无法连接账号服务。", "error");
  }
}

async function sendPhoneCode() {
  const phone = elements.accountPhoneInput.value.trim();
  elements.sendPhoneCodeButton.disabled = true;
  try {
    const result = await syncApi.sendPhoneCode(phone);
    if (result.developmentCode) {
      elements.accountPhoneCodeInput.value = result.developmentCode;
      showAccountStatus(
        "开发验证码已自动填入：" + result.developmentCode,
        "success"
      );
    } else {
      showAccountStatus("验证码已发送。", "success");
    }
  } catch (error) {
    showAccountStatus(error.message, "error");
  } finally {
    elements.sendPhoneCodeButton.disabled = false;
  }
}

async function signInWithPhone(event) {
  event.preventDefault();
  try {
    const result = await syncApi.verifyPhoneCode(
      elements.accountPhoneInput.value.trim(),
      elements.accountPhoneCodeInput.value.trim()
    );
    state.account = result.account;
    prepareSyncMetadataForAccount();
    elements.phoneLoginForm.reset();
    renderAccount();
    showAccountStatus("登录成功，正在检查同步状态…", "success");
    reconcileCloudData();
  } catch (error) {
    showAccountStatus(error.message, "error");
  }
}

function createCurrentSyncSnapshot() {
  return window.SyncTools.createSyncSnapshot({
    plans: state.plans,
    focusSessions: state.focusSessions,
    achievementUnlocks: [],
    dailyGoalMinutes: state.dailyGoalMinutes
  }, new Date());
}

async function uploadCloudData() {
  try {
    const snapshot = createCurrentSyncSnapshot();
    await syncApi.uploadSnapshot(snapshot);
    markSyncCompleted(snapshot);
    showAccountStatus("本机数据已上传。", "success");
  } catch (error) {
    showAccountStatus(error.message, "error");
  }
}

function applySyncSnapshot(snapshot) {
  const normalized = window.SyncTools.validateSyncSnapshot(snapshot);
  state.sync.isApplyingRemote = true;
  try {
    state.plans = normalized.data.plans;
    state.focusSessions = normalized.data.focusSessions;
    state.dailyGoalMinutes = normalized.data.dailyGoalMinutes;
    resetHistoryFilter();
    savePlans();
    saveFocusSessions();
    window.GoalTools.saveDailyGoal(localStorage, state.dailyGoalMinutes);
  } finally {
    state.sync.isApplyingRemote = false;
  }
  renderPlans();
  renderSessionData();
}

async function downloadCloudData() {
  try {
    const result = await syncApi.downloadSnapshot();
    if (!result.snapshot) {
      showAccountStatus("云端还没有数据，请先上传本机数据。", "");
      return;
    }
    if (!window.confirm("下载会替换本机的计划和专注数据，确定继续吗？")) {
      return;
    }
    applySyncSnapshot(result.snapshot);
    markSyncCompleted(result.snapshot);
    showAccountStatus("云端数据已下载到本机。", "success");
  } catch (error) {
    showAccountStatus(error.message, "error");
  }
}

async function signOutAccount() {
  try {
    await syncApi.signOut();
    state.account = null;
    state.sync.hasConflict = false;
    window.clearTimeout(state.sync.timeoutId);
    renderAccount();
    showAccountStatus("已退出登录，本机数据仍然保留。", "success");
  } catch (error) {
    showAccountStatus(error.message, "error");
  }
}

function showDataManagementStatus(message, type) {
  elements.dataManagementStatus.textContent = message;
  elements.dataManagementStatus.classList.remove("is-success", "is-error");

  if (type) {
    elements.dataManagementStatus.classList.add("is-" + type);
  }
}

function resetHistoryFilter() {
  state.historyFilter.period = "today";
  state.historyFilter.planKey = "";
  state.historyFilter.visibleCount = SESSION_PAGE_SIZE;
}

function clearFocusHistory() {
  const confirmed = window.confirm(
    "确定清除全部专注历史吗？"
  );

  if (!confirmed) {
    return;
  }

  state.focusSessions = [];
  resetHistoryFilter();
  saveFocusSessions();
  renderSessionData();
  showDataManagementStatus("专注历史已清除。", "success");
}

function resetApplicationData() {
  const confirmationText = window.prompt(
    "这会清除计划和专注记录。请输入“重置”确认："
  );

  if (confirmationText !== "重置") {
    showDataManagementStatus("未执行完整重置。", "");
    return;
  }

  stopTimerInterval();
  state.plans = [];
  state.focusSessions = [];
  state.timer.phase = "focus";
  state.timer.selectedMinutes = DEFAULT_TIMER_MINUTES;
  state.timer.breakMinutes = window.PomodoroTools.DEFAULT_BREAK_MINUTES;
  state.timer.longBreakMinutes =
    window.PomodoroTools.DEFAULT_LONG_BREAK_MINUTES;
  state.timer.focusesPerLongBreak =
    window.PomodoroTools.DEFAULT_FOCUSES_PER_LONG_BREAK;
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
  closePlanDetails();
  closePostponePlanDialog();

  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(SESSION_STORAGE_KEY);
  localStorage.removeItem("focus-plan-achievements");
  localStorage.removeItem(
    window.TimerStateTools.TIMER_STATE_STORAGE_KEY
  );
  localStorage.removeItem(
    window.SoundTools.SOUND_SETTINGS_STORAGE_KEY
  );

  renderPlans();
  renderSessionData();
  elements.customMinutesInput.value = String(DEFAULT_TIMER_MINUTES);
  elements.breakMinutesInput.value = String(
    window.PomodoroTools.DEFAULT_BREAK_MINUTES
  );
  elements.longBreakMinutesInput.value = String(
    window.PomodoroTools.DEFAULT_LONG_BREAK_MINUTES
  );
  elements.focusesPerLongBreakInput.value = String(
    window.PomodoroTools.DEFAULT_FOCUSES_PER_LONG_BREAK
  );
  elements.autoStartBreakInput.checked = false;
  elements.autoStartFocusInput.checked = false;
  updateSoundControls();
  elements.timerStatus.textContent =
    "准备开始 · " + DEFAULT_TIMER_MINUTES + " 分钟";
  updateDurationButtons();
  updateTimerDisplay();
  showDataManagementStatus("应用数据已全部重置。", "success");
  markLocalDataChanged();
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

function isWebPushSupported() {
  return "serviceWorker" in window.navigator &&
    "PushManager" in window &&
    "Notification" in window;
}

function showPushStatus(message, type) {
  elements.pushStatus.textContent = message;
  elements.pushStatus.dataset.type = type || "";
}

function getPushErrorMessage(error) {
  if (
    error?.name === "NotAllowedError" ||
    /permission denied/i.test(String(error?.message || ""))
  ) {
    return "浏览器拒绝创建推送订阅，请检查系统通知权限。";
  }

  return error?.message || "系统推送操作失败。";
}

function updatePushControls() {
  if (!isWebPushSupported()) {
    elements.pushSubscriptionButton.textContent = "当前浏览器不支持";
    elements.pushSubscriptionButton.disabled = true;
    elements.testPushButton.disabled = true;
    return;
  }

  if (pushPublicKey === "") {
    elements.pushSubscriptionButton.textContent = "服务器未配置";
    elements.pushSubscriptionButton.disabled = true;
    elements.testPushButton.disabled = true;
    return;
  }

  elements.pushSubscriptionButton.textContent = activePushSubscription
    ? "关闭系统推送"
    : "开启系统推送";
  elements.pushSubscriptionButton.disabled = pushBusy;
  elements.testPushButton.disabled = pushBusy || !activePushSubscription;
}

async function syncPushReminderJobs(allowSubscriptionRepair) {
  if (!activePushSubscription) {
    return;
  }

  const endpoint = activePushSubscription.endpoint;
  const reminders = window.PushReminderTools.createReminderJobs(state.plans);

  try {
    return await pushApi.syncReminders(endpoint, reminders);
  } catch (error) {
    if (error.status === 404 && allowSubscriptionRepair !== false) {
      await pushApi.saveSubscription(activePushSubscription);
      return syncPushReminderJobs(false);
    }

    console.warn("后台提醒任务同步失败：", error);
  }
}

function schedulePushReminderSync(delay) {
  if (!activePushSubscription) {
    return;
  }

  if (pushReminderSyncTimer !== null) {
    clearTimeout(pushReminderSyncTimer);
  }

  pushReminderSyncTimer = setTimeout(function () {
    pushReminderSyncTimer = null;
    syncPushReminderJobs();
  }, delay ?? 600);
}

async function refreshPushSubscription() {
  if (!isWebPushSupported()) {
    showPushStatus("当前浏览器不支持 Web Push。", "error");
    updatePushControls();
    return;
  }

  try {
    const config = await pushApi.getConfig();
    pushPublicKey = config.configured ? config.publicKey : "";

    if (pushPublicKey === "") {
      showPushStatus(
        "请先运行 npm.cmd run push:keys，然后重启本地服务。",
        "error"
      );
      updatePushControls();
      return;
    }

    const registration = await window.navigator.serviceWorker.ready;
    activePushSubscription =
      await registration.pushManager.getSubscription();
    showPushStatus(
      activePushSubscription
        ? "当前设备已订阅，计划提醒会自动同步。"
        : "当前设备尚未订阅后台推送。",
      activePushSubscription ? "success" : ""
    );
    if (activePushSubscription) {
      schedulePushReminderSync(0);
    }
  } catch (error) {
    showPushStatus(getPushErrorMessage(error), "error");
  } finally {
    updatePushControls();
  }
}

async function togglePushSubscription() {
  if (pushBusy || pushPublicKey === "") {
    return;
  }

  pushBusy = true;
  updatePushControls();

  try {
    if (activePushSubscription) {
      const endpoint = activePushSubscription.endpoint;
      await pushApi.deleteSubscription(endpoint);
      await activePushSubscription.unsubscribe();
      activePushSubscription = null;
      if (pushReminderSyncTimer !== null) {
        clearTimeout(pushReminderSyncTimer);
        pushReminderSyncTimer = null;
      }
      showPushStatus("当前设备已关闭后台推送。", "success");
      return;
    }

    const permission = Notification.permission === "granted"
      ? "granted"
      : await Notification.requestPermission();
    updateNotificationButton();

    if (permission !== "granted") {
      showPushStatus("需要允许通知权限才能开启系统推送。", "error");
      return;
    }

    const registration = await window.navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey:
        window.PushApi.urlBase64ToUint8Array(pushPublicKey)
    });

    try {
      await pushApi.saveSubscription(subscription);
      activePushSubscription = subscription;
      const result = await syncPushReminderJobs();
      showPushStatus(
        "后台推送已开启，已同步 " +
          (result?.reminderCount || 0) +
          " 个计划提醒。",
        "success"
      );
    } catch (error) {
      await subscription.unsubscribe();
      throw error;
    }
  } catch (error) {
    showPushStatus(getPushErrorMessage(error), "error");
  } finally {
    pushBusy = false;
    updatePushControls();
  }
}

async function sendTestPush() {
  if (pushBusy || !activePushSubscription) {
    return;
  }

  pushBusy = true;
  updatePushControls();
  showPushStatus("正在发送测试推送…", "");

  try {
    await pushApi.sendTest(activePushSubscription.endpoint);
    showPushStatus("测试推送已发送，请查看系统通知。", "success");
  } catch (error) {
    showPushStatus(error.message, "error");

    if (error.status === 410) {
      activePushSubscription = null;
    }
  } finally {
    pushBusy = false;
    updatePushControls();
  }
}

async function handleBackgroundReminderMessage(event) {
  const message = event.data;

  if (message?.type !== "FOCUS_PLAN_BACKGROUND_REMINDER") {
    return;
  }

  const payload = message.payload || {};
  const matchingPlan = state.plans.find(function (plan) {
    return String(plan.id) === String(payload.planId);
  });

  if (!matchingPlan || matchingPlan.completed || matchingPlan.reminded) {
    return;
  }

  const delivered = await deliverReminder(
    payload.title || "计划时间到了",
    payload.body || matchingPlan.title,
    payload.tag || "plan-" + matchingPlan.id,
    {
      targetPage: "plans",
      planId: matchingPlan.id,
      snoozeOptions: window.ReminderTools.SNOOZE_MINUTE_VALUES
    }
  );

  if (delivered) {
    matchingPlan.reminded = true;
    savePlans();
  }
}

function activateReminder(reminder) {
  const targetPage = reminder.targetPage || "plans";
  navigateToPage(targetPage);

  if (reminder.planId === undefined || reminder.planId === null) {
    return;
  }

  const matchingPlan = state.plans.find(function (plan) {
    return String(plan.id) === String(reminder.planId);
  });

  if (matchingPlan) {
    openPlanDetails(matchingPlan);
  }
}

function snoozePlanReminder(reminder, minutes) {
  if (reminder.planId === undefined || reminder.planId === null) {
    return;
  }

  const matchingPlan = state.plans.find(function (plan) {
    return String(plan.id) === String(reminder.planId);
  });
  const snoozedUntil = window.ReminderTools.calculateSnoozedUntil(
    Date.now(),
    minutes
  );

  if (!matchingPlan || snoozedUntil === null) {
    return;
  }

  matchingPlan.snoozedUntil = snoozedUntil;
  matchingPlan.reminded = false;
  savePlans();
  showActionFeedback(
    "将在" + (minutes === 60 ? " 1 小时" : " " + minutes + " 分钟") +
      "后再次提醒。",
    null
  );
}

async function showSystemNotification(title, body, tag, options) {
  if (!("Notification" in window) || Notification.permission !== "granted") {
    return false;
  }

  const reminderOptions = options || {};
  const notificationOptions = {
    body,
    tag,
    icon: "./assets/icons/app-icon-192.png",
    renotify: true,
    data: {
      url: "./#" + (reminderOptions.targetPage || "plans"),
      planId: reminderOptions.planId ?? null
    }
  };

  try {
    if ("serviceWorker" in window.navigator) {
      const registration = await window.navigator.serviceWorker.ready;
      await registration.showNotification(title, notificationOptions);
      return true;
    }

    new Notification(title, notificationOptions);
    return true;
  } catch (error) {
    console.error("发送通知失败：", error);
    return false;
  }
}

async function deliverReminder(title, body, tag, options) {
  const reminderOptions = options || {};

  if (
    !window.ReminderPresenter.shouldUseSystemNotification(
      document.visibilityState
    )
  ) {
    try {
      reminderPresenter.show({
        title,
        body,
        tag,
        ...reminderOptions
      });
      return true;
    } catch (error) {
      console.error("显示网页提醒失败：", error);
      return false;
    }
  }

  return showSystemNotification(title, body, tag, reminderOptions);
}

function requestNotificationPermission() {
  if (!("Notification" in window)) {
    return;
  }

  Notification.requestPermission().then(function (permission) {
    updateNotificationButton();

    if (permission === "granted") {
      showSystemNotification(
        "计划提醒已开启",
        "计划或专注计时结束后，我们会在这里提醒你。",
        "notifications-enabled",
        { targetPage: "settings" }
      );
      checkPlanReminders();
    }
  });
}

async function checkPlanReminders() {
  if (planReminderCheckInProgress) {
    return;
  }

  planReminderCheckInProgress = true;
  let plansChanged = false;
  const now = Date.now();

  try {
    for (const plan of state.plans) {
      if (!window.ReminderTools.isPlanReminderDue(plan, now)) {
        continue;
      }

      const notificationSent = await deliverReminder(
        plan.reminderMinutes > 0
          ? "计划即将到期"
          : "计划时间到了",
        plan.title,
        "plan-" + plan.id,
        {
          targetPage: "plans",
          planId: plan.id,
          snoozeOptions: window.ReminderTools.SNOOZE_MINUTE_VALUES
        }
      );

      if (notificationSent) {
        plan.reminded = true;
        plansChanged = true;
      }
    }

    if (plansChanged) {
      savePlans();
    }
  } finally {
    planReminderCheckInProgress = false;
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
  const target = state.timer.focusesPerLongBreak;

  elements.timerCycleStatus.textContent =
    "本轮 " + completed + " / " + target;
  elements.timerCycleHint.textContent =
    "完成 " + target + " 轮后进入长休息";

  while (elements.timerCycleIndicators.children.length < target) {
    elements.timerCycleIndicators.appendChild(
      document.createElement("span")
    );
  }

  while (elements.timerCycleIndicators.children.length > target) {
    elements.timerCycleIndicators.lastElementChild.remove();
  }

  Array.from(elements.timerCycleIndicators.children).forEach(function (
    indicator,
    index
  ) {
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
  elements.focusesPerLongBreakInput.disabled = settingsLocked;
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

    deliverReminder(
      "专注计时完成",
      completedSession.plannedMinutes + " 分钟专注已完成：" +
        completedSession.planTitle,
      "focus-timer-complete",
      { targetPage: "focus" }
    );
    playTimerSound("focusComplete");
    state.timer.completedFocusesInCycle += 1;
    const useLongBreak = window.PomodoroTools.shouldUseLongBreak(
      state.timer.completedFocusesInCycle,
      state.timer.focusesPerLongBreak
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

  deliverReminder(
    "休息结束",
    "休息完成，可以开始下一轮专注。",
    "focus-break-complete",
    { targetPage: "focus" }
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

function handleFocusesPerLongBreakChange() {
  const focuses = window.PomodoroTools.getValidFocusesPerLongBreak(
    elements.focusesPerLongBreakInput.value
  );

  if (focuses === null) {
    elements.focusesPerLongBreakInput.value =
      String(state.timer.focusesPerLongBreak);
    return;
  }

  state.timer.focusesPerLongBreak = focuses;

  if (state.timer.completedFocusesInCycle >= focuses) {
    state.timer.completedFocusesInCycle = 0;
  }

  updateTimerCycleDisplay();
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
  elements.focusesPerLongBreakInput.value =
    String(state.timer.focusesPerLongBreak);
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

  if (action === "escape") {
    if (elements.postponePlanDialog.open) {
      closePostponePlanDialog();
    } else if (elements.planDetailsDialog.open) {
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
  if ("serviceWorker" in window.navigator) {
    window.navigator.serviceWorker.addEventListener(
      "message",
      handleBackgroundReminderMessage
    );
  }
  window.addEventListener("online", reconcileCloudData);
  window.addEventListener("online", function () {
    schedulePushReminderSync(0);
  });
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible") {
      reconcileCloudData();
      checkPlanReminders();
    }
  });
  window.addEventListener("hashchange", handlePageHashChange);
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
  elements.pushSubscriptionButton.addEventListener(
    "click",
    togglePushSubscription
  );
  elements.testPushButton.addEventListener("click", sendTestPush);
  elements.createPlanButton.addEventListener("click", function () {
    navigateToPage("plans");
    openCreatePlanForm();
  });
  elements.cancelPlanButton.addEventListener("click", closePlanForm);
  elements.closePlanFormButton.addEventListener("click", closePlanForm);
  elements.planFormBackdrop.addEventListener("click", closePlanForm);
  elements.planForm.addEventListener("submit", handlePlanSubmit);
  elements.planTitleInput.addEventListener("input", function () {
    updatePlanCharacterCount(
      elements.planTitleInput,
      elements.planTitleCount,
      window.PlanFormTools.TITLE_MAX_LENGTH
    );
    clearPlanFormError();
  });
  elements.planNotesInput.addEventListener("input", function () {
    updatePlanCharacterCount(
      elements.planNotesInput,
      elements.planNotesCount,
      window.PlanFormTools.NOTES_MAX_LENGTH
    );
  });
  elements.planDueAtInput.addEventListener("change", function () {
    updatePlanTimeControls();
    clearPlanFormError();
  });
  elements.planRepeatInput.addEventListener("change", clearPlanFormError);
  elements.planQuickTimeButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      elements.planDueAtInput.value =
        window.PlanFormTools.getQuickPlanDate(
          button.dataset.planTimePreset
        );
      updatePlanTimeControls();
      clearPlanFormError();
    });
  });
  elements.closePlanDetailsButton.addEventListener(
    "click",
    closePlanDetails
  );
  elements.editPlanFromDetailsButton.addEventListener(
    "click",
    editPlanFromDetails
  );
  elements.postponePlanForm.addEventListener(
    "submit",
    handlePostponePlanSubmit
  );
  elements.closePostponePlanButton.addEventListener(
    "click",
    closePostponePlanDialog
  );
  elements.cancelPostponePlanButton.addEventListener(
    "click",
    closePostponePlanDialog
  );
  elements.postponePlanReasonInput.addEventListener("input", function () {
    updatePostponeReasonCount();
    clearPostponePlanError();
  });
  elements.postponePlanDueAtInput.addEventListener(
    "change",
    clearPostponePlanError
  );
  elements.postponePlanDialog.addEventListener("close", function () {
    state.postponingPlanId = null;
  });
  elements.subtaskForm.addEventListener("submit", addSubtask);
  elements.dailyGoalForm.addEventListener("submit", saveDailyGoalSetting);
  elements.planDetailsDialog.addEventListener("close", function () {
    state.viewingPlanId = null;
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

  elements.clearHistoryButton.addEventListener("click", clearFocusHistory);
  elements.resetAppButton.addEventListener("click", resetApplicationData);
  elements.dictionaryForm.addEventListener("submit", handleDictionarySubmit);
  elements.dictionaryQueryInput.addEventListener(
    "input",
    handleDictionaryQueryInput
  );
  elements.sendPhoneCodeButton.addEventListener("click", sendPhoneCode);
  elements.phoneLoginForm.addEventListener("submit", signInWithPhone);
  elements.uploadSyncButton.addEventListener("click", uploadCloudData);
  elements.downloadSyncButton.addEventListener("click", downloadCloudData);
  elements.signOutButton.addEventListener("click", signOutAccount);

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
  elements.focusesPerLongBreakInput.addEventListener(
    "change",
    handleFocusesPerLongBreakChange
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
  localStorage.removeItem("focus-plan-achievements");
  applyTheme(state.theme, false);
  bindEvents();
  registerServiceWorker();
  renderAppPage(state.activePage, false);
  const expectedPageHash = window.NavigationTools.createPageHash(
    state.activePage
  );

  if (window.location.hash !== expectedPageHash) {
    window.history.replaceState(null, "", expectedPageHash);
  }
  updateNotificationButton();
  refreshPushSubscription();
  renderAccount();
  refreshAccount();
  renderPlans();
  renderSessionData();
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
