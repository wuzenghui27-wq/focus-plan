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
  const SOUND_SOURCES = {
    focusComplete: "assets/sounds/focus-complete.wav",
    shortBreakComplete: "assets/sounds/short-break-complete.wav",
    longBreakComplete: "assets/sounds/long-break-complete.wav"
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

  function getSoundSource(eventName) {
    return SOUND_SOURCES[eventName] || null;
  }

  return {
    SOUND_SETTINGS_STORAGE_KEY: SOUND_SETTINGS_STORAGE_KEY,
    DEFAULT_SOUND_SETTINGS: DEFAULT_SOUND_SETTINGS,
    SOUND_SOURCES: SOUND_SOURCES,
    normalizeVolume: normalizeVolume,
    normalizeSoundSettings: normalizeSoundSettings,
    loadSoundSettings: loadSoundSettings,
    saveSoundSettings: saveSoundSettings,
    getSoundSource: getSoundSource
  };
});
