import * as GoalTools from "../../domain/goals.js";
import * as PomodoroTools from "../../domain/pomodoro.js";
import * as TimerStateTools from "../../domain/timer-state.js";
import * as SoundTools from "../../domain/sound.js";
import * as SyncTools from "../../domain/sync.js";
import * as ThemeTools from "../../domain/theme.js";
import { AUTO_SYNC_DELAY_MS, DEFAULT_TIMER_MINUTES, SESSION_PAGE_SIZE, SESSION_STORAGE_KEY, STORAGE_KEY, elements, saveFocusSessions, savePlans, state } from "../core/context.js";
import { applyTheme } from "../core/view-helpers.js";
import { closePlanDetails, closePlanForm, closePostponePlanDialog, renderPlans } from "./plans.js";
import { renderSessionData } from "./history.js";
import { stopTimerInterval, updateDurationButtons, updateSoundControls, updateTimerDisplay } from "./focus.js";

import { createSyncApi } from "../services/sync-api.js";

const syncApi = createSyncApi(window.fetch.bind(window), "/api");

function persistSyncMetadata() {
  SyncTools.saveSyncMetadata(localStorage, state.sync.metadata);
}

function hasSyncableLocalData() {
  return state.plans.length > 0 ||
    state.focusSessions.length > 0 ||
    state.dailyGoalMinutes !== GoalTools.DEFAULT_DAILY_GOAL_MINUTES;
}

function prepareSyncMetadataForAccount() {
  if (state.sync.metadata.accountId === state.account.id) {
    return;
  }

  state.sync.metadata = SyncTools.createSyncMetadata(state.account.id);
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
    const action = SyncTools.decideSyncAction(
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
  return SyncTools.createSyncSnapshot({
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
  const normalized = SyncTools.validateSyncSnapshot(snapshot);
  state.sync.isApplyingRemote = true;
  try {
    state.plans = normalized.data.plans;
    state.focusSessions = normalized.data.focusSessions;
    state.dailyGoalMinutes = normalized.data.dailyGoalMinutes;
    resetHistoryFilter();
    savePlans();
    saveFocusSessions();
    GoalTools.saveDailyGoal(localStorage, state.dailyGoalMinutes);
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
  state.timer.breakMinutes = PomodoroTools.DEFAULT_BREAK_MINUTES;
  state.timer.longBreakMinutes =
    PomodoroTools.DEFAULT_LONG_BREAK_MINUTES;
  state.timer.focusesPerLongBreak =
    PomodoroTools.DEFAULT_FOCUSES_PER_LONG_BREAK;
  state.timer.completedFocusesInCycle = 0;
  state.timer.isLongBreak = false;
  state.timer.remainingSeconds = DEFAULT_TIMER_MINUTES * 60;
  state.timer.selectedPlanId = "";
  state.timer.isRunning = false;
  state.timer.endAt = null;
  state.timer.completionRecorded = false;
  state.timer.autoStartBreak = false;
  state.timer.autoStartFocus = false;
  state.sound = { ...SoundTools.DEFAULT_SOUND_SETTINGS };
  resetHistoryFilter();
  closePlanForm();
  closePlanDetails();
  closePostponePlanDialog();

  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(SESSION_STORAGE_KEY);
  localStorage.removeItem(
    TimerStateTools.TIMER_STATE_STORAGE_KEY
  );
  localStorage.removeItem(
    SoundTools.SOUND_SETTINGS_STORAGE_KEY
  );

  renderPlans();
  renderSessionData();
  elements.customMinutesInput.value = String(DEFAULT_TIMER_MINUTES);
  elements.breakMinutesInput.value = String(
    PomodoroTools.DEFAULT_BREAK_MINUTES
  );
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
  markLocalDataChanged();
}

function bindSettingsEvents() {
  window.addEventListener("online", reconcileCloudData);
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible") {
      reconcileCloudData();
    }
  });
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
  elements.sendPhoneCodeButton.addEventListener("click", sendPhoneCode);
  elements.phoneLoginForm.addEventListener("submit", signInWithPhone);
  elements.uploadSyncButton.addEventListener("click", uploadCloudData);
  elements.downloadSyncButton.addEventListener("click", downloadCloudData);
  elements.signOutButton.addEventListener("click", signOutAccount);
}
export {
  bindSettingsEvents,
  clearFocusHistory,
  downloadCloudData,
  markLocalDataChanged,
  reconcileCloudData,
  refreshAccount,
  renderAccount,
  resetApplicationData,
  sendPhoneCode,
  showDataManagementStatus,
  signInWithPhone,
  signOutAccount,
  uploadCloudData
};
