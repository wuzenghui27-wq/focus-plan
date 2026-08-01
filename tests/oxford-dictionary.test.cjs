const assert = require("assert");
const { createOxfordDictionary } = require("../server/oxford-dictionary.cjs");

const translationPayload = {
  results: [{
    lexicalEntries: [{
      lexicalCategory: { id: "noun", text: "Noun" },
      entries: [{ senses: [{ translations: [{ text: "专注" }] }] }]
    }]
  }]
};
const entryPayload = {
  results: [{
    lexicalEntries: [{
      lexicalCategory: { id: "noun", text: "Noun" },
      entries: [{
        pronunciations: [{ phoneticSpelling: "ˈfəʊkəs" }],
        senses: [{
          definitions: ["the centre of interest or activity"]
        }]
      }]
    }]
  }]
};
const sentencePayload = {
  results: [{
    lexicalEntries: [{
      lexicalCategory: { id: "noun", text: "Noun" },
      sentences: [{ text: "Focus on one task at a time." }]
    }]
  }]
};

(async function () {
  const requests = [];
  const dictionary = createOxfordDictionary({
    appId: "app-id",
    appKey: "app-key",
    fetchImpl: async function (url, options) {
      requests.push({ url, headers: options.headers });
      return {
        ok: true,
        json: async function () {
          if (url.includes("/translations/")) {
            return translationPayload;
          }
          if (url.includes("/sentences/")) {
            return sentencePayload;
          }
          return entryPayload;
        }
      };
    }
  });

  const result = await dictionary.lookup("focus");
  assert.strictEqual(result.direction, "en-zh");
  assert.strictEqual(result.phonetic, "ˈfəʊkəs");
  assert.strictEqual(result.entries[0].meanings[0].chinese, "专注");
  assert.strictEqual(
    result.entries[0].meanings[0].example,
    "Focus on one task at a time."
  );
  assert.strictEqual(requests[0].headers.app_id, "app-id");
  assert.match(requests[0].url, /translations\/en\/zh\/focus$/);
  assert.match(requests[1].url, /entries\/en-gb\/focus$/);
  assert.match(requests[2].url, /sentences\/en-gb\/focus$/);

  const chineseRequests = [];
  const chineseDictionary = createOxfordDictionary({
    appId: "app-id",
    appKey: "app-key",
    fetchImpl: async function (url) {
      chineseRequests.push(url);
      return {
        ok: true,
        json: async function () {
          if (url.includes("/translations/")) {
            return {
              results: [{
                lexicalEntries: [{
                  lexicalCategory: { id: "noun", text: "Noun" },
                  entries: [{ senses: [{ translations: [{ text: "focus" }] }] }]
                }]
              }]
            };
          }
          if (url.includes("/sentences/")) {
            return sentencePayload;
          }
          return entryPayload;
        }
      };
    }
  });
  const chineseResult = await chineseDictionary.lookup("专注");
  assert.strictEqual(chineseResult.direction, "zh-en");
  assert.strictEqual(chineseResult.headword, "focus");
  assert.strictEqual(chineseResult.entries[0].meanings[0].chinese, "专注");
  assert.match(chineseRequests[0], /translations\/zh\/en\//);

  const unconfigured = createOxfordDictionary({});
  await assert.rejects(unconfigured.lookup("focus"), function (error) {
    return error.statusCode === 503;
  });

  const offlineDictionary = createOxfordDictionary({
    appId: "app-id",
    appKey: "app-key",
    fetchImpl: async function () {
      throw new TypeError("fetch failed");
    }
  });
  await assert.rejects(offlineDictionary.lookup("apple"), function (error) {
    return error.statusCode === 502 && /无法连接 Oxford/.test(error.message);
  });

  console.log("Oxford dictionary: all tests passed");
})().catch(function (error) {
  console.error(error);
  process.exitCode = 1;
});
