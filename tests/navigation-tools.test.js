import assert from "assert";
import {
  DEFAULT_PAGE,
  PAGE_NAMES,
  normalizePage,
  getPageFromHash,
  createPageHash,
  getPageTitle
} from "../src/domain/navigation.js";

assert.deepStrictEqual(
  PAGE_NAMES,
  ["plans", "focus", "history", "dictionary", "settings"]
);
assert.strictEqual(normalizePage("focus"), "focus");
assert.strictEqual(normalizePage("unknown"), DEFAULT_PAGE);
assert.strictEqual(normalizePage(null), DEFAULT_PAGE);
assert.strictEqual(getPageFromHash("#plans"), "plans");
assert.strictEqual(getPageFromHash("#/history"), "history");
assert.strictEqual(getPageFromHash("#bad-page"), DEFAULT_PAGE);
assert.strictEqual(getPageFromHash(""), DEFAULT_PAGE);
assert.strictEqual(createPageHash("settings"), "#settings");
assert.strictEqual(createPageHash("dictionary"), "#dictionary");
assert.strictEqual(createPageHash("bad-page"), "#plans");
assert.strictEqual(getPageTitle("focus"), "专注时长");
assert.strictEqual(getPageTitle("dictionary"), "查词");
assert.strictEqual(getPageTitle("invalid"), "我的计划表");

console.log("Navigation tools: all tests passed");
