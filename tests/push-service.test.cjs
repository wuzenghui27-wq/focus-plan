const assert = require("node:assert/strict");
const {
  createPushService,
  normalizeSubscription
} = require("../server/push-service.cjs");

const subscription = {
  endpoint: "https://push.example.test/device",
  expirationTime: null,
  keys: { p256dh: "public", auth: "auth" }
};

assert.deepEqual(normalizeSubscription(subscription), subscription);
assert.throws(
  () => normalizeSubscription({ endpoint: "http://unsafe.test" }),
  /格式无效/
);

const calls = [];
const sender = {
  setVapidDetails: function (...args) {
    calls.push({ type: "config", args });
  },
  sendNotification: async function (...args) {
    calls.push({ type: "send", args });
    return { statusCode: 201 };
  }
};
const service = createPushService({
  subject: "mailto:test@example.com",
  publicKey: "public-vapid",
  privateKey: "private-vapid",
  sender
});

assert.equal(service.isConfigured(), true);
assert.equal(service.getPublicKey(), "public-vapid");
assert.deepEqual(calls[0].args, [
  "mailto:test@example.com",
  "public-vapid",
  "private-vapid"
]);

(async function () {
  await service.sendNotification(subscription, {
    title: "测试",
    body: "消息",
    tag: "push-test"
  });

  assert.equal(calls[1].type, "send");
  assert.deepEqual(calls[1].args[0], subscription);
  assert.equal(JSON.parse(calls[1].args[1]).title, "测试");
  assert.equal(calls[1].args[2].topic, "push-test");

  const unconfigured = createPushService({ sender });
  assert.equal(unconfigured.isConfigured(), false);
  assert.throws(
    () => unconfigured.sendNotification(subscription, {}),
    /not configured/
  );

  console.log("Push service: all tests passed");
})().catch(function (error) {
  console.error(error);
  process.exitCode = 1;
});
