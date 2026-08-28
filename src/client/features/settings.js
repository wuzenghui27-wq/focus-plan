import * as PomodoroTools from "../../domain/pomodoro.js";
import * as SoundTools from "../../domain/sound.js";
import * as ThemeTools from "../../domain/theme.js";
import * as TimerStateTools from "../../domain/timer-state.js";
import {
  DEFAULT_TIMER_MINUTES,
  SESSION_PAGE_SIZE,
  SESSION_STORAGE_KEY,
  STORAGE_KEY,
  elements,
  saveFocusSessions,
  state
} from "../core/context.js";
import { applyTheme } from "../core/view-helpers.js";
import {
  closePlanDetails,
  closePlanForm,
  closePostponePlanDialog,
  renderPlans
} from "./plans.js";
import { renderSessionData } from "./history.js";
import {
  stopTimerInterval,
  updateDurationButtons,
  updateSoundControls,
  updateTimerDisplay
} from "./focus.js";

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
  if (!window.confirm("确定清除全部专注历史吗？")) {
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
  state.timer = {
    phase: "focus",
    selectedMinutes: DEFAULT_TIMER_MINUTES,
    breakMinutes: PomodoroTools.DEFAULT_BREAK_MINUTES,
    longBreakMinutes: PomodoroTools.DEFAULT_LONG_BREAK_MINUTES,
    focusesPerLongBreak: PomodoroTools.DEFAULT_FOCUSES_PER_LONG_BREAK,
    completedFocusesInCycle: 0,
    isLongBreak: false,
    remainingSeconds: DEFAULT_TIMER_MINUTES * 60,
    selectedPlanId: "",
    isRunning: false,
    intervalId: null,
    endAt: null,
    completionRecorded: false,
    autoStartBreak: false,
    autoStartFocus: false
  };
  state.sound = { ...SoundTools.DEFAULT_SOUND_SETTINGS };
  resetHistoryFilter();
  closePlanForm();
  closePlanDetails();
  closePostponePlanDialog();

  [
    STORAGE_KEY,
    SESSION_STORAGE_KEY,
    TimerStateTools.TIMER_STATE_STORAGE_KEY,
    SoundTools.SOUND_SETTINGS_STORAGE_KEY
  ].forEach(function (key) {
    localStorage.removeItem(key);
  });

  renderPlans();
  renderSessionData();
  elements.customMinutesInput.value = String(DEFAULT_TIMER_MINUTES);
  elements.breakMinutesInput.value = String(PomodoroTools.DEFAULT_BREAK_MINUTES);
  elements.longBreakMinutesInput.value = String(
    PomodoroTools.DEFAULT_LONG_BREAK_MINUTES
  );
  elements.focusesPerLongBreakInput.value = String(
    PomodoroTools.DEFAULT_FOCUSES_PER_LONG_BREAK
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

function bindSettingsEvents() {
  elements.themeToggle.addEventListener("change", function () {
    applyTheme(
      elements.themeToggle.checked
        ? ThemeTools.DARK_THEME
        : ThemeTools.LIGHT_THEME,
      true
    );
  });
  elements.clearHistoryButton.addEventListener("click", clearFocusHistory);
  elements.resetAppButton.addEventListener("click", resetApplicationData);
}

export {
  bindSettingsEvents,
  clearFocusHistory,
  resetApplicationData,
  showDataManagementStatus
};
