(function (root, factory) {
  const tools = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = tools;
  }

  root.SoundTools = tools;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const SOUND_SETTINGS_STORAGE_KEY = "focus-plan-sound-settings";
  const DEFAULT_SOUND_SETTINGS = {
    muted: false,
    volume: 0.45
  };
  const SOUND_EVENT_LABELS = {
    focusComplete: "专注完成",
    shortBreakComplete: "短休息结束",
    longBreakComplete: "长休息结束"
  };
  const NOTE_FREQUENCIES = {
    A3: 220,
    B3: 246.94,
    Cs4: 277.18,
    D4: 293.66,
    E4: 329.63,
    Fs4: 369.99,
    G4: 392,
    A4: 440,
    B4: 493.88,
    Cs5: 554.37,
    D5: 587.33,
    E5: 659.25,
    Fs5: 739.99,
    G5: 783.99,
    A5: 880
  };

  function createSequence(noteNames, step, duration) {
    return noteNames.map(function (noteName, index) {
      return {
        frequency: NOTE_FREQUENCIES[noteName],
        start: index * step,
        duration: duration
      };
    });
  }

  const CANON_CUES = {
    focusComplete: {
      label: "卡农上行和弦",
      notes: createSequence(
        ["D4", "Fs4", "A4", "D5", "A4", "Cs5", "E5", "A5"],
        0.19,
        0.52
      )
    },
    shortBreakComplete: {
      label: "卡农和声进行",
      notes: createSequence(
        ["D4", "A3", "B3", "Fs4", "G4", "D4", "G4", "A4"],
        0.24,
        0.58
      )
    },
    longBreakComplete: {
      label: "卡农旋律片段",
      notes: createSequence(
        [
          "Fs5", "E5", "D5", "Cs5",
          "B4", "A4", "B4", "Cs5",
          "D5", "Cs5", "B4", "A4",
          "G4", "Fs4", "G4", "E4"
        ],
        0.18,
        0.46
      )
    }
  };

  function normalizeVolume(value) {
    const volume = Number(value);

    if (!Number.isFinite(volume)) {
      return DEFAULT_SOUND_SETTINGS.volume;
    }

    return Math.round(Math.min(1, Math.max(0, volume)) * 100) / 100;
  }

  function normalizeSoundSettings(value) {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      return { ...DEFAULT_SOUND_SETTINGS };
    }

    return {
      muted: Boolean(value.muted),
      volume: normalizeVolume(value.volume)
    };
  }

  function loadSoundSettings(storage) {
    try {
      const storedValue = storage.getItem(SOUND_SETTINGS_STORAGE_KEY);

      if (storedValue === null) {
        return {
          settings: { ...DEFAULT_SOUND_SETTINGS },
          recovered: false
        };
      }

      const parsedValue = JSON.parse(storedValue);

      if (
        parsedValue === null ||
        typeof parsedValue !== "object" ||
        Array.isArray(parsedValue)
      ) {
        throw new TypeError("Invalid sound settings.");
      }

      return {
        settings: normalizeSoundSettings(parsedValue),
        recovered: false
      };
    } catch (error) {
      try {
        storage.removeItem(SOUND_SETTINGS_STORAGE_KEY);
      } catch (removeError) {
        // Storage can be unavailable in privacy-restricted contexts.
      }

      return {
        settings: { ...DEFAULT_SOUND_SETTINGS },
        recovered: true
      };
    }
  }

  function saveSoundSettings(storage, settings) {
    try {
      storage.setItem(
        SOUND_SETTINGS_STORAGE_KEY,
        JSON.stringify(normalizeSoundSettings(settings))
      );
      return { ok: true, error: null };
    } catch (error) {
      return { ok: false, error: error };
    }
  }

  function getSoundCue(eventName) {
    return CANON_CUES[eventName] || null;
  }

  function getSoundEventLabel(eventName) {
    return SOUND_EVENT_LABELS[eventName] || "";
  }

  return {
    SOUND_SETTINGS_STORAGE_KEY: SOUND_SETTINGS_STORAGE_KEY,
    DEFAULT_SOUND_SETTINGS: DEFAULT_SOUND_SETTINGS,
    SOUND_EVENT_LABELS: SOUND_EVENT_LABELS,
    CANON_CUES: CANON_CUES,
    normalizeVolume: normalizeVolume,
    normalizeSoundSettings: normalizeSoundSettings,
    loadSoundSettings: loadSoundSettings,
    saveSoundSettings: saveSoundSettings,
    getSoundCue: getSoundCue,
    getSoundEventLabel: getSoundEventLabel
  };
});
