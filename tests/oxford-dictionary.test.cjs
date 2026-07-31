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
          definitions: ["the centre of interest or activity"],
          examples: [{ text: "This lesson is the focus of today's work." }]
        }]
      }]
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
          return url.includes("/translations/")
            ? translationPayload
            : entryPayload;
        }
      };
    }
  });

  const result = await dictionary.lookup("focus");
  assert.strictEqual(result.direction, "en-zh");
  assert.strictEqual(result.phonetic, "ˈfəʊkəs");
  assert.strictEqual(result.entries[0].meanings[0].chinese, "专注");
  assert.strictEqual(requests[0].headers.app_id, "app-id");
  assert.match(requests[0].url, /translations\/en\/zh\/focus$/);
  assert.match(requests[1].url, /entries\/en-gb\/focus$/);

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

  console.log("Oxford dictionary: all tests passed");
})().catch(function (error) {
  console.error(error);
  process.exitCode = 1;
});
