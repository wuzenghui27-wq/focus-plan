import * as StorageTools from "../../domain/storage.js";
import * as PlanTools from "../../domain/plans.js";
import * as RecurrenceTools from "../../domain/recurrence.js";
import * as ReminderTools from "../../domain/reminders.js";
import * as TextTools from "../../domain/text.js";
import * as SubtaskTools from "../../domain/subtasks.js";
import * as GoalTools from "../../domain/goals.js";
import * as PomodoroTools from "../../domain/pomodoro.js";
import * as TimerStateTools from "../../domain/timer-state.js";
import * as SoundTools from "../../domain/sound.js";
import * as NavigationTools from "../../domain/navigation.js";
import { createPersistenceEvents } from "./persistence-events.js";
const STORAGE_KEY = "focus-plan-plans";
const SESSION_STORAGE_KEY = "focus-plan-sessions";
const DEFAULT_TIMER_MINUTES = 25;
const MIN_TIMER_MINUTES = 1;
const MAX_TIMER_MINUTES = 180;
const REMINDER_CHECK_MS = 30000;
const SESSION_PAGE_SIZE = 10;
const TIMER_STATE_OPTIONS = {
  minimumFocusMinutes: MIN_TIMER_MINUTES,
  maximumFocusMinutes: MAX_TIMER_MINUTES,
  defaultFocusMinutes: DEFAULT_TIMER_MINUTES,
  minimumBreakMinutes: PomodoroTools.MIN_BREAK_MINUTES,
  maximumBreakMinutes: PomodoroTools.MAX_BREAK_MINUTES,
  defaultBreakMinutes: PomodoroTools.DEFAULT_BREAK_MINUTES,
  minimumLongBreakMinutes: PomodoroTools.MIN_BREAK_MINUTES,
  maximumLongBreakMinutes: PomodoroTools.MAX_BREAK_MINUTES,
  defaultLongBreakMinutes:
    PomodoroTools.DEFAULT_LONG_BREAK_MINUTES,
  minimumFocusesPerLongBreak:
    PomodoroTools.MIN_FOCUSES_PER_LONG_BREAK,
  maximumFocusesPerLongBreak:
    PomodoroTools.MAX_FOCUSES_PER_LONG_BREAK,
  defaultFocusesPerLongBreak:
    PomodoroTools.DEFAULT_FOCUSES_PER_LONG_BREAK
};
const restoredTimerResult = TimerStateTools.loadTimerState(
  localStorage,
  TIMER_STATE_OPTIONS,
  Date.now()
);
const restoredSoundResult = SoundTools.loadSoundSettings(localStorage);

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
const persistenceEvents = createPersistenceEvents();

function configurePersistenceCallbacks(callbacks) {
  persistenceEvents.configure(callbacks);
}

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
  activePage: NavigationTools.getPageFromHash(
    window.location.hash
  ),
  plans: loadPlans(),
  focusSessions: loadFocusSessions(),
  dailyGoalMinutes: GoalTools.loadDailyGoal(localStorage),
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
      PomodoroTools.DEFAULT_BREAK_MINUTES,
    longBreakMinutes: restoredTimerResult.timer?.longBreakMinutes ||
      PomodoroTools.DEFAULT_LONG_BREAK_MINUTES,
    focusesPerLongBreak:
      restoredTimerResult.timer?.focusesPerLongBreak ||
      PomodoroTools.DEFAULT_FOCUSES_PER_LONG_BREAK,
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
        repeat: RecurrenceTools.normalizeRepeat(plan.repeat),
        reminderMinutes: ReminderTools.normalizeReminderMinutes(
          plan.reminderMinutes
        ),
        notes: TextTools.normalizePlanNotes(plan.notes),
        subtasks: SubtaskTools.normalizeSubtasks(plan.subtasks),
        reminded: Boolean(plan.reminded),
        snoozedUntil: ReminderTools.normalizeSnoozedUntil(
          plan.snoozedUntil
        ),
        postponedFrom: typeof plan.postponedFrom === "string"
          ? plan.postponedFrom
          : "",
        postponeReason: PlanTools.normalizePostponeReason(
          plan.postponeReason
        ).slice(0, PlanTools.POSTPONE_REASON_MAX_LENGTH),
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
  persistenceEvents.notifyDataChanged();
  persistenceEvents.notifyPlansSaved();
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
  persistenceEvents.notifyDataChanged();
}

function loadStoredArray(key, label, normalizeItems) {
  const result = StorageTools.loadJsonArray(
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
  const result = StorageTools.saveJson(localStorage, key, value);

  if (!result.ok) {
    console.error("保存本地数据失败：", result.error);
    persistenceEvents.notifyStorageError();
  }
}
export {
  DEFAULT_TIMER_MINUTES,
  MAX_TIMER_MINUTES,
  MIN_TIMER_MINUTES,
  PRIORITY_LABELS,
  REMINDER_CHECK_MS,
  REMINDER_LABELS,
  REPEAT_LABELS,
  SESSION_PAGE_SIZE,
  SESSION_STORAGE_KEY,
  STORAGE_KEY,
  configurePersistenceCallbacks,
  elements,
  restoredTimerResult,
  saveFocusSessions,
  savePlans,
  state,
  storageRecoveryLabels
};
