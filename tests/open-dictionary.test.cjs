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
const {
  createTatoebaProvider
} = require("../server/tatoeba-provider.cjs");

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
    word: "apple",
    phonetic: "/ˈæp.əl/",
    meanings: [{
      partOfSpeech: "noun",
      definitions: [
        { definition: "A common, round fruit produced by an apple tree." },
        { definition: "The tree that produces apples." }
      ]
    }, {
      partOfSpeech: "verb",
      definitions: [{ definition: "To become apple-like." }]
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
  const exampleProvider = createTatoebaProvider({
    cacheDirectory: path.join(temporaryDirectory, "cache"),
    fetchImpl: async function () {
      return {
        ok: true,
        json: async function () {
          return { data: [{ text: "The little apple is red." }] };
        }
      };
    }
  });
  const dictionary = createOpenDictionary({
    cedict,
    englishProvider: provider,
    exampleProvider
  });

  const englishResult = await dictionary.lookup("apple");
  assert.strictEqual(englishResult.direction, "en-zh");
  assert.strictEqual(englishResult.phonetic, "/ˈæp.əl/");
  assert.strictEqual(englishResult.entries.length, 1);
  assert.strictEqual(englishResult.entries[0].meanings.length, 1);
  assert.strictEqual(englishResult.entries[0].meanings[0].chinese, "苹果");
  assert.strictEqual(
    englishResult.entries[0].meanings[0].english,
    "A common, round fruit produced by an apple tree."
  );
  assert.strictEqual(
    englishResult.entries[0].meanings[0].example,
    "The little apple is red."
  );

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
  await assert.rejects(offlineDictionary.lookup("苹果"), /offline/);

  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
  console.log("Open dictionary: all tests passed");
})().catch(function (error) {
  console.error(error);
  process.exitCode = 1;
});
