const assert = require("assert");
const { createDictionaryApi } = require("../dictionary-api.js");

(async function () {
  let requestedUrl = "";
  const api = createDictionaryApi(async function (url) {
    requestedUrl = url;
    return {
      ok: true,
      json: async function () {
        return { result: { headword: "focus" } };
      }
    };
  }, "/api/");

  assert.deepStrictEqual(await api.lookup("专注 学习"), { headword: "focus" });
  assert.strictEqual(requestedUrl, "/api/dictionary?q=%E4%B8%93%E6%B3%A8%20%E5%AD%A6%E4%B9%A0");

  const failingApi = createDictionaryApi(async function () {
    return {
      ok: false,
      json: async function () {
        return { error: "没有找到这个词。" };
      }
    };
  });
  await assert.rejects(failingApi.lookup("missing"), /没有找到/);

  console.log("Dictionary API: all tests passed");
})().catch(function (error) {
  console.error(error);
  process.exitCode = 1;
});
