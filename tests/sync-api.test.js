import assert from "node:assert/strict";
import * as SyncApi from "../src/client/services/sync-api.js";

const requests = [];
const fakeFetch = async function (url, options) {
  requests.push({ url, options });

  return {
    ok: true,
    status: 200,
    json: async function () {
      return { ok: true };
    }
  };
};
const api = SyncApi.createSyncApi(fakeFetch, "/api/");

assert.equal(api.getSocialLoginUrl("wechat"), "/api/auth/wechat/start");
assert.equal(api.getSocialLoginUrl("qq"), "/api/auth/qq/start");
assert.throws(() => api.getSocialLoginUrl("email"), /Unsupported/);

(async function () {
  await api.sendPhoneCode("13800138000");
  await api.verifyPhoneCode("13800138000", "123456");
  await api.uploadSnapshot({ schemaVersion: 1 }, "2026-07-28T00:00:00Z");
  await api.downloadSnapshot();

  assert.equal(requests[0].url, "/api/auth/phone/code");
  assert.equal(requests[0].options.method, "POST");
  assert.equal(
    requests[1].url,
    "/api/auth/phone/verify"
  );
  assert.equal(requests[2].options.method, "PUT");
  assert.equal(
    requests[2].options.headers["If-Match"],
    "2026-07-28T00:00:00Z"
  );
  assert.equal(requests[3].url, "/api/sync");
  assert.equal(requests[3].options.credentials, "include");

  console.log("Sync API: all tests passed");
})().catch(function (error) {
  console.error(error);
  process.exitCode = 1;
});
