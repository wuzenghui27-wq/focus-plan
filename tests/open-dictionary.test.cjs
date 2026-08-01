const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const zlib = require("zlib");
const {
  createCedictStore,
  parseCedictLine
} = require("../server/cedict-store.cjs");
const {
  createFreeDictionaryProvider
} = require("../server/free-dictionary-provider.cjs");
const {
  createOpenDictionary
} = require("../server/open-dictionary.cjs");

const sampleData = [
  "# CC-CEDICT sample",
  "專注 专注 [zhuan1 zhu4] /to focus/to concentrate/",
  "蘋果 苹果 [ping2 guo3] /apple/"
].join("\n");

(async function () {
  const parsed = parseCedictLine(
    "專注 专注 [zhuan1 zhu4] /to focus/to concentrate/"
  );
  assert.strictEqual(parsed.simplified, "专注");
  assert.deepStrictEqual(parsed.definitions, ["to focus", "to concentrate"]);

  const temporaryDirectory = fs.mkdtempSync(
    path.join(os.tmpdir(), "fanp-dictionary-")
  );
  const cedictPath = path.join(temporaryDirectory, "cedict.txt.gz");
  fs.writeFileSync(cedictPath, zlib.gzipSync(sampleData));

  const cedict = createCedictStore({ filePath: cedictPath });
  assert.strictEqual(cedict.findChinese("专注")[0].traditional, "專注");
  assert.strictEqual(cedict.findEnglish("focus")[0].simplified, "专注");

  const payload = [{
    word: "focus",
    phonetic: "/ˈfəʊkəs/",
    meanings: [{
      partOfSpeech: "noun",
      definitions: [{
        definition: "the main subject receiving attention",
        example: "Learning is the focus of today's plan."
      }]
    }]
  }];
  const provider = createFreeDictionaryProvider({
    cacheDirectory: path.join(temporaryDirectory, "cache"),
    fetchImpl: async function () {
      return {
        ok: true,
        status: 200,
        json: async function () {
          return payload;
        }
      };
    }
  });
  const dictionary = createOpenDictionary({ cedict, englishProvider: provider });

  const englishResult = await dictionary.lookup("focus");
  assert.strictEqual(englishResult.direction, "en-zh");
  assert.strictEqual(englishResult.phonetic, "/ˈfəʊkəs/");
  assert.match(englishResult.entries[0].meanings[0].chinese, /专注/);

  const chineseResult = await dictionary.lookup("专注");
  assert.strictEqual(chineseResult.direction, "zh-en");
  assert.strictEqual(chineseResult.headword, "focus");

  const offlineDictionary = createOpenDictionary({
    cedict,
    englishProvider: {
      lookup: async function () {
        const error = new Error("offline");
        error.statusCode = 502;
        throw error;
      }
    }
  });
  const fallbackResult = await offlineDictionary.lookup("苹果");
  assert.strictEqual(fallbackResult.provider, "CC-CEDICT");
  assert.strictEqual(fallbackResult.entries[0].meanings[0].english, "apple");

  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
  console.log("Open dictionary: all tests passed");
})().catch(function (error) {
  console.error(error);
  process.exitCode = 1;
});
