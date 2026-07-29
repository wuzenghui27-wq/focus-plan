const webPush = require("web-push");

function normalizeSubscription(value) {
  const endpoint = String(value?.endpoint || "");
  const p256dh = String(value?.keys?.p256dh || "");
  const auth = String(value?.keys?.auth || "");

  if (
    !endpoint.startsWith("https://") ||
    p256dh === "" ||
    auth === ""
  ) {
    throw new Error("推送订阅格式无效。");
  }

  return {
    endpoint,
    expirationTime: Number.isFinite(value.expirationTime)
      ? value.expirationTime
      : null,
    keys: { p256dh, auth }
  };
}

function createPushService(options) {
  const subject = String(options?.subject || "");
  const publicKey = String(options?.publicKey || "");
  const privateKey = String(options?.privateKey || "");
  const sender = options?.sender || webPush;
  const configured = subject !== "" && publicKey !== "" && privateKey !== "";

  if (configured) {
    sender.setVapidDetails(subject, publicKey, privateKey);
  }

  return {
    isConfigured: function () {
      return configured;
    },
    getPublicKey: function () {
      return configured ? publicKey : "";
    },
    normalizeSubscription,
    sendNotification: function (subscription, payload) {
      if (!configured) {
        throw new Error("Web Push is not configured.");
      }

      return sender.sendNotification(
        normalizeSubscription(subscription),
        JSON.stringify(payload),
        {
          TTL: 60,
          urgency: "high",
          topic: String(payload.tag || "focus-plan").slice(0, 32)
        }
      );
    }
  };
}

module.exports = { createPushService, normalizeSubscription };
