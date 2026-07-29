const assert = require("node:assert/strict");
const http = require("node:http");
const { createAccountStore } = require("../server/account-store.cjs");
const { createApiHandler } = require("../server/api-handler.cjs");

const store = createAccountStore(":memory:");
const sentPayloads = [];
const pushService = {
  isConfigured: () => true,
  getPublicKey: () => "test-public-key",
  normalizeSubscription: (subscription) => subscription,
  sendNotification: async function (subscription, payload) {
    sentPayloads.push({ subscription, payload });
  }
};
const handler = createApiHandler({
  store,
  secret: "test-secret",
  isDevelopment: true,
  pushService
});
const server = http.createServer(async function (request, response) {
  const url = new URL(request.url, "http://127.0.0.1");
  const handled = await handler(request, response, url);

  if (!handled) {
    response.writeHead(404);
    response.end();
  }
});

const subscription = {
  endpoint: "https://push.example.test/integration-device",
  expirationTime: null,
  keys: { p256dh: "public", auth: "auth" }
};

server.listen(0, "127.0.0.1", async function () {
  const address = server.address();
  const baseUrl = "http://127.0.0.1:" + address.port + "/api/push";
  const jsonRequest = function (path, method, body) {
    return fetch(baseUrl + path, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
  };

  try {
    const configResponse = await fetch(baseUrl + "/config");
    assert.equal(configResponse.status, 200);
    assert.equal((await configResponse.json()).publicKey, "test-public-key");

    const saveResponse = await jsonRequest(
      "/subscriptions",
      "POST",
      { subscription }
    );
    assert.equal(saveResponse.status, 201);
    assert.deepEqual(
      store.getPushSubscription(subscription.endpoint),
      subscription
    );

    const testResponse = await jsonRequest(
      "/test",
      "POST",
      { endpoint: subscription.endpoint }
    );
    assert.equal(testResponse.status, 200);
    assert.equal(sentPayloads.length, 1);
    assert.equal(sentPayloads[0].payload.tag, "push-test");

    const deleteResponse = await jsonRequest(
      "/subscriptions",
      "DELETE",
      { endpoint: subscription.endpoint }
    );
    assert.equal(deleteResponse.status, 200);
    assert.equal(store.getPushSubscription(subscription.endpoint), null);

    console.log("Push API handler: all tests passed");
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    server.close();
    store.close();
  }
});
