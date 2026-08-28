import * as NavigationTools from "../domain/navigation.js";
import {
  DEFAULT_TIMER_MINUTES,
  REMINDER_CHECK_MS,
  configurePersistenceCallbacks,
  restoredTimerResult,
  state,
  storageRecoveryLabels
} from "./core/context.js";
import { registerServiceWorker } from "./core/offline.js";
import { handleApplicationShortcut } from "./core/shortcuts.js";
import { applyTheme } from "./core/view-helpers.js";
import { bindDictionaryEvents } from "./features/dictionary.js";
import {
  bindFocusEvents,
  restoreTimerInterface,
  setSoundPlaybackStatus,
  setTimerDuration,
  updateSoundControls
} from "./features/focus.js";
import { bindHistoryEvents, renderSessionData } from "./features/history.js";
import {
  bindNavigationEvents,
  renderAppPage
} from "./features/navigation.js";
import { bindPlanEvents, renderPlans } from "./features/plans.js";
import {
  bindReminderEvents,
  checkPlanReminders,
  refreshPushSubscription,
  refreshTimeBasedStates,
  schedulePushReminderSync,
  updateNotificationButton
} from "./features/reminders.js";
import {
  bindSettingsEvents,
  showDataManagementStatus
} from "./features/settings.js";

function bindEvents() {
  document.addEventListener("keydown", handleApplicationShortcut);
  bindNavigationEvents();
  bindPlanEvents();
  bindFocusEvents();
  bindHistoryEvents();
  bindDictionaryEvents();
  bindSettingsEvents();
  bindReminderEvents();
}

function initializeApp() {
  configurePersistenceCallbacks({
    onPlansSaved: schedulePushReminderSync,
    onStorageError: function () {
      showDataManagementStatus(
        "保存失败：浏览器本地存储空间可能不足。",
        "error"
      );
    }
  });
  applyTheme(state.theme, false);
  bindEvents();
  registerServiceWorker();
  renderAppPage(state.activePage, false);
  const expectedPageHash = NavigationTools.createPageHash(state.activePage);

  if (window.location.hash !== expectedPageHash) {
    window.history.replaceState(null, "", expectedPageHash);
  }
  updateNotificationButton();
  refreshPushSubscription();
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

export { initializeApp };
