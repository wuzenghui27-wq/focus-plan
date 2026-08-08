import * as PushReminderTools from "../../../domain/push-reminders.js";
import { readJson, sendJson } from "../http.js";

function createPushRoutes({ store, pushService }) {
  return async function handlePushRoute(request, response, url) {
    if (request.method === "GET" && url.pathname === "/api/push/config") {
      sendJson(response, 200, {
        configured: Boolean(pushService?.isConfigured()),
        publicKey: pushService?.getPublicKey() || ""
      });
      return true;
    }

    if (request.method === "POST" && url.pathname === "/api/push/subscriptions") {
      if (!pushService?.isConfigured()) {
        sendJson(response, 503, { error: "服务器尚未配置 Web Push 密钥。" });
        return true;
      }
      const subscription = pushService.normalizeSubscription(
        (await readJson(request)).subscription
      );
      store.savePushSubscription(subscription, new Date().toISOString());
      sendJson(response, 201, { ok: true });
      return true;
    }

    if (request.method === "DELETE" && url.pathname === "/api/push/subscriptions") {
      const endpoint = String((await readJson(request)).endpoint || "");
      store.deletePushSubscription(endpoint);
      sendJson(response, 200, { ok: true });
      return true;
    }

    if (request.method === "POST" && url.pathname === "/api/push/test") {
      if (!pushService?.isConfigured()) {
        sendJson(response, 503, { error: "服务器尚未配置 Web Push 密钥。" });
        return true;
      }
      const endpoint = String((await readJson(request)).endpoint || "");
      const subscription = store.getPushSubscription(endpoint);
      if (!subscription) {
        sendJson(response, 404, { error: "没有找到当前设备的推送订阅。" });
        return true;
      }
      try {
        await pushService.sendNotification(subscription, {
          title: "FanP 推送测试",
          body: "服务器已经可以向这台设备发送后台通知。",
          tag: "push-test",
          url: "./#settings"
        });
        sendJson(response, 200, { ok: true });
      } catch (error) {
        if ([404, 410].includes(error.statusCode)) {
          store.deletePushSubscription(endpoint);
        }
        sendJson(response, error.statusCode === 410 ? 410 : 502, {
          error: "推送服务暂时无法发送通知。"
        });
      }
      return true;
    }

    if (request.method === "PUT" && url.pathname === "/api/push/reminders") {
      if (!pushService?.isConfigured()) {
        sendJson(response, 503, { error: "服务器尚未配置 Web Push 密钥。" });
        return true;
      }
      const body = await readJson(request);
      const endpoint = String(body.endpoint || "");
      if (!store.getPushSubscription(endpoint)) {
        sendJson(response, 404, { error: "没有找到当前设备的推送订阅。" });
        return true;
      }
      const reminders = PushReminderTools.normalizeReminderJobs(body.reminders);
      store.syncPushReminderJobs(endpoint, reminders, new Date().toISOString());
      sendJson(response, 200, { ok: true, reminderCount: reminders.length });
      return true;
    }

    return false;
  };
}

export { createPushRoutes };
