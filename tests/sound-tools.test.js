import assert from "assert";
import {
  SOUND_SETTINGS_STORAGE_KEY,
  DEFAULT_SOUND_SETTINGS,
  CANON_CUES,
  normalizeVolume,
  normalizeSoundSettings,
  loadSoundSettings,
  saveSoundSettings,
  getSoundCue,
  getSoundEventLabel
} from "../src/domain/sound.js";

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
assert.deepStrictEqual(normalizeSoundSettings(null), DEFAULT_SOUND_SETTINGS);
assert.deepStrictEqual(
  normalizeSoundSettings({ muted: 1, volume: 0.7, theme: "old-theme" }),
  { muted: true, volume: 0.7 }
);

const emptyResult = loadSoundSettings(createStorage(null));
assert.deepStrictEqual(emptyResult.settings, DEFAULT_SOUND_SETTINGS);
assert.strictEqual(emptyResult.recovered, false);

const storedResult = loadSoundSettings(createStorage(JSON.stringify({
  muted: true,
  volume: 0.62,
  theme: "bright"
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

for (const eventName of Object.keys(CANON_CUES)) {
  const cue = getSoundCue(eventName);

  assert.ok(cue.notes.length >= 8);
  cue.notes.forEach(function (note, index) {
    assert.ok(Number.isFinite(note.frequency));
    assert.ok(note.frequency > 0);
    assert.ok(note.start >= 0);
    assert.ok(note.duration > 0);

    if (index > 0) {
      assert.ok(note.start > cue.notes[index - 1].start);
    }
  });
}

assert.strictEqual(getSoundCue("unknown"), null);
assert.strictEqual(getSoundEventLabel("focusComplete"), "专注完成");
assert.strictEqual(getSoundEventLabel("unknown"), "");

console.log("Sound tools: all tests passed");
