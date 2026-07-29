const assert = require("node:assert/strict");
const PushApi = require("../push-api.js");

assert.deepEqual(
  Array.from(PushApi.urlBase64ToUint8Array("AQID")),
  [1, 2, 3]
);

const requests = [];
const fakeFetch = async function (url, options) {
  requests.push({ url, options: options || {} });
  return {
    ok: true,
    status: 200,
    json: async function () {
      return { ok: true, configured: true, publicKey: "AQID" };
    }
  };
};
const api = PushApi.createPushApi(fakeFetch, "/api/");
const subscription = {
  endpoint: "https://push.example.test/device",
  keys: { p256dh: "public", auth: "auth" }
};

(async function () {
  await api.getConfig();
  await api.saveSubscription(subscription);
  await api.sendTest(subscription.endpoint);
  await api.deleteSubscription(subscription.endpoint);

  assert.equal(requests[0].url, "/api/push/config");
  assert.equal(requests[1].options.method, "POST");
  assert.deepEqual(
    JSON.parse(requests[1].options.body),
    { subscription }
  );
  assert.equal(requests[2].url, "/api/push/test");
  assert.equal(requests[3].options.method, "DELETE");

  console.log("Push API: all tests passed");
})().catch(function (error) {
  console.error(error);
  process.exitCode = 1;
});
