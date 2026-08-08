import * as ReminderTools from "../../domain/reminders.js";
import * as PushReminderTools from "../../domain/push-reminders.js";
import { elements, savePlans, state } from "../core/context.js";
import { navigateToPage } from "./navigation.js";
import { openPlanDetails, renderPlans, showActionFeedback } from "./plans.js";

import {
  createPushApi,
  urlBase64ToUint8Array
} from "../services/push-api.js";
import {
  createPresenter,
  shouldUseSystemNotification
} from "../ui/reminder-presenter.js";

let planReminderCheckInProgress = false;
let activePushSubscription = null;
let pushPublicKey = "";
let pushBusy = false;
let pushReminderSyncTimer = null;
const pushApi = createPushApi(window.fetch.bind(window), "/api");
const reminderPresenter = createPresenter(elements.reminderRegion, {
  displayDuration: 8000,
  maximumVisible: 3,
  onActivate: activateReminder,
  onSnooze: snoozePlanReminder
});

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
  const reminders = PushReminderTools.createReminderJobs(state.plans);

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
        urlBase64ToUint8Array(pushPublicKey)
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
      snoozeOptions: ReminderTools.SNOOZE_MINUTE_VALUES
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
  const snoozedUntil = ReminderTools.calculateSnoozedUntil(
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
    !shouldUseSystemNotification(
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
      if (!ReminderTools.isPlanReminderDue(plan, now)) {
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
          snoozeOptions: ReminderTools.SNOOZE_MINUTE_VALUES
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

function bindReminderEvents() {
  if ("serviceWorker" in window.navigator) {
    window.navigator.serviceWorker.addEventListener(
      "message",
      handleBackgroundReminderMessage
    );
  }
  window.addEventListener("online", function () {
    schedulePushReminderSync(0);
  });
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible") {
      checkPlanReminders();
    }
  });
  elements.notificationButton.addEventListener(
    "click",
    requestNotificationPermission
  );
  elements.pushSubscriptionButton.addEventListener(
    "click",
    togglePushSubscription
  );
  elements.testPushButton.addEventListener("click", sendTestPush);
}
export {
  bindReminderEvents,
  checkPlanReminders,
  deliverReminder,
  handleBackgroundReminderMessage,
  refreshPushSubscription,
  refreshTimeBasedStates,
  requestNotificationPermission,
  schedulePushReminderSync,
  sendTestPush,
  togglePushSubscription,
  updateNotificationButton
};
