(function (root, factory) {
  const tools = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = tools;
  }

  root.SoundTools = tools;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const SOUND_SETTINGS_STORAGE_KEY = "focus-plan-sound-settings";
  const DEFAULT_SOUND_THEME = "bright";
  const DEFAULT_SOUND_SETTINGS = {
    muted: false,
    volume: 0.45,
    theme: DEFAULT_SOUND_THEME
  };
  const SOUND_EVENT_LABELS = {
    focusComplete: "专注完成",
    shortBreakComplete: "短休息结束",
    longBreakComplete: "长休息结束"
  };
  const SOUND_THEMES = {
    bright: {
      label: "轻盈和弦",
      sources: {
        focusComplete: "assets/sounds/focus-complete.wav",
        shortBreakComplete: "assets/sounds/short-break-complete.wav",
        longBreakComplete: "assets/sounds/long-break-complete.wav"
      }
    },
    calm: {
      label: "柔和低音",
      sources: {
        focusComplete: "assets/sounds/calm-focus-complete.wav",
        shortBreakComplete:
          "assets/sounds/calm-short-break-complete.wav",
        longBreakComplete:
          "assets/sounds/calm-long-break-complete.wav"
      }
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
      volume: normalizeVolume(value.volume),
      theme: Object.hasOwn(SOUND_THEMES, value.theme)
        ? value.theme
        : DEFAULT_SOUND_THEME
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

  function getSoundTheme(themeName) {
    return SOUND_THEMES[themeName] || SOUND_THEMES[DEFAULT_SOUND_THEME];
  }

  function getSoundSource(eventName, themeName) {
    return getSoundTheme(themeName).sources[eventName] || null;
  }

  function getSoundEventLabel(eventName) {
    return SOUND_EVENT_LABELS[eventName] || "";
  }

  return {
    SOUND_SETTINGS_STORAGE_KEY: SOUND_SETTINGS_STORAGE_KEY,
    DEFAULT_SOUND_THEME: DEFAULT_SOUND_THEME,
    DEFAULT_SOUND_SETTINGS: DEFAULT_SOUND_SETTINGS,
    SOUND_EVENT_LABELS: SOUND_EVENT_LABELS,
    SOUND_THEMES: SOUND_THEMES,
    normalizeVolume: normalizeVolume,
    normalizeSoundSettings: normalizeSoundSettings,
    loadSoundSettings: loadSoundSettings,
    saveSoundSettings: saveSoundSettings,
    getSoundTheme: getSoundTheme,
    getSoundSource: getSoundSource,
    getSoundEventLabel: getSoundEventLabel
  };
});
