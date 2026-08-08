import assert from "assert";
import {
  createEcdictProvider,
  getChineseTranslation,
  getPrimaryPartOfSpeech
} from "../src/server/dictionary/ecdict-provider.js";

const provider = createEcdictProvider();

const light = provider.lookup("light");
assert.strictEqual(getPrimaryPartOfSpeech(light), "noun");
assert.strictEqual(getChineseTranslation(light, "noun"), "光");

const heal = provider.lookup("heal");
assert.strictEqual(getChineseTranslation(heal, "verb"), "痊愈");

const went = provider.lookup("went");
assert.strictEqual(went.lemma, "go");
assert.strictEqual(getChineseTranslation(went, "verb"), "去");

const mice = provider.lookup("mice");
assert.strictEqual(mice.lemma, "mouse");
assert.strictEqual(getChineseTranslation(mice, "noun"), "老鼠");

console.log("ECDICT provider: all tests passed");
