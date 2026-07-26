const assert = require("assert");
const {
  SOUND_SETTINGS_STORAGE_KEY,
  DEFAULT_SOUND_SETTINGS,
  normalizeVolume,
  normalizeSoundSettings,
  loadSoundSettings,
  saveSoundSettings,
  getSoundSource
} = require("../sound-tools.js");

function createStorage(initialValue) {
  let value = initialValue;
  let removed = false;

  return {
    getItem: function (key) {
      assert.strictEqual(key, SOUND_SETTINGS_STORAGE_KEY);
      return removed ? null : value;
    },
    setItem: function (key, nextValue) {
      assert.strictEqual(key, SOUND_SETTINGS_STORAGE_KEY);
      value = nextValue;
      removed = false;
    },
    removeItem: function (key) {
      assert.strictEqual(key, SOUND_SETTINGS_STORAGE_KEY);
      removed = true;
    },
    value: function () {
      return value;
    },
    wasRemoved: function () {
      return removed;
    }
  };
}

assert.strictEqual(normalizeVolume(-2), 0);
assert.strictEqual(normalizeVolume(2), 1);
assert.strictEqual(normalizeVolume(0.456), 0.46);
assert.strictEqual(normalizeVolume("invalid"), 0.45);
assert.deepStrictEqual(
  normalizeSoundSettings(null),
  DEFAULT_SOUND_SETTINGS
);
assert.deepStrictEqual(
  normalizeSoundSettings({ muted: 1, volume: 0.7 }),
  { muted: true, volume: 0.7 }
);

const emptyResult = loadSoundSettings(createStorage(null));
assert.deepStrictEqual(emptyResult.settings, DEFAULT_SOUND_SETTINGS);
assert.strictEqual(emptyResult.recovered, false);

const storedResult = loadSoundSettings(createStorage(JSON.stringify({
  muted: true,
  volume: 0.62
})));
assert.deepStrictEqual(
  storedResult.settings,
  { muted: true, volume: 0.62 }
);

const corruptStorage = createStorage("{broken");
const corruptResult = loadSoundSettings(corruptStorage);
assert.deepStrictEqual(corruptResult.settings, DEFAULT_SOUND_SETTINGS);
assert.strictEqual(corruptResult.recovered, true);
assert.strictEqual(corruptStorage.wasRemoved(), true);

const writableStorage = createStorage(null);
assert.strictEqual(
  saveSoundSettings(writableStorage, { muted: false, volume: 2 }).ok,
  true
);
assert.deepStrictEqual(
  JSON.parse(writableStorage.value()),
  { muted: false, volume: 1 }
);
assert.strictEqual(
  saveSoundSettings({
    setItem: function () {
      throw new Error("Quota exceeded.");
    }
  }, DEFAULT_SOUND_SETTINGS).ok,
  false
);

assert.strictEqual(
  getSoundSource("focusComplete"),
  "assets/sounds/focus-complete.wav"
);
assert.strictEqual(getSoundSource("unknown"), null);

console.log("Sound tools: all tests passed");
