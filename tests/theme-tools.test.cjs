const assert = require("assert");
const {
  THEME_STORAGE_KEY,
  normalizeTheme,
  getInitialTheme,
  loadTheme,
  saveTheme
} = require("../theme-tools.js");

assert.strictEqual(normalizeTheme("light"), "light");
assert.strictEqual(normalizeTheme("dark"), "dark");
assert.strictEqual(normalizeTheme("blue"), null);
assert.strictEqual(normalizeTheme(null), null);

assert.strictEqual(getInitialTheme("dark", false), "dark");
assert.strictEqual(getInitialTheme("light", true), "light");
assert.strictEqual(getInitialTheme(null, true), "dark");
assert.strictEqual(getInitialTheme(null, false), "light");
assert.strictEqual(getInitialTheme("invalid", true), "dark");

const values = new Map([[THEME_STORAGE_KEY, "dark"]]);
const storage = {
  getItem: function (key) {
    return values.has(key) ? values.get(key) : null;
  },
  setItem: function (key, value) {
    values.set(key, value);
  }
};

assert.strictEqual(loadTheme(storage, false), "dark");
assert.strictEqual(saveTheme(storage, "light").ok, true);
assert.strictEqual(values.get(THEME_STORAGE_KEY), "light");
assert.strictEqual(saveTheme(storage, "invalid").ok, false);

const unavailableStorage = {
  getItem: function () {
    throw new Error("Storage unavailable.");
  },
  setItem: function () {
    throw new Error("Storage unavailable.");
  }
};

assert.strictEqual(loadTheme(unavailableStorage, true), "dark");
assert.strictEqual(saveTheme(unavailableStorage, "dark").ok, false);

console.log("Theme tools: all tests passed");
