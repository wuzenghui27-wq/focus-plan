import assert from "assert";
import * as DictionaryTools from "../src/domain/dictionary.js";

assert.strictEqual(DictionaryTools.normalizeQuery("  focus   time  "), "focus time");
assert.strictEqual(DictionaryTools.detectDirection("focus"), "en-zh");
assert.strictEqual(DictionaryTools.detectDirection("专注"), "zh-en");
assert.strictEqual(DictionaryTools.validateQuery(" ").valid, false);
assert.deepStrictEqual(DictionaryTools.validateQuery("计划"), {
  valid: true,
  value: "计划",
  direction: "zh-en"
});

const normalized = DictionaryTools.normalizeLookupResult({
  query: "focus",
  direction: "en-zh",
  headword: "focus",
  phonetic: "ˈfəʊkəs",
  entries: [{
    partOfSpeech: "noun",
    meanings: [{ english: "attention", chinese: "注意力", example: "Keep focus." }]
  }]
});
assert.strictEqual(normalized.entries[0].meanings[0].chinese, "注意力");

console.log("Dictionary tools: all tests passed");
