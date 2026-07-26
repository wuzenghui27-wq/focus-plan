(function (root, factory) {
  const tools = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = tools;
  }

  root.ThemeTools = tools;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const THEME_STORAGE_KEY = "focus-plan-theme";
  const LIGHT_THEME = "light";
  const DARK_THEME = "dark";

  function normalizeTheme(value) {
    return value === DARK_THEME || value === LIGHT_THEME
      ? value
      : null;
  }

  function getInitialTheme(storedTheme, prefersDark) {
    return normalizeTheme(storedTheme) ||
      (prefersDark ? DARK_THEME : LIGHT_THEME);
  }

  function loadTheme(storage, prefersDark) {
    try {
      return getInitialTheme(
        storage.getItem(THEME_STORAGE_KEY),
        prefersDark
      );
    } catch (error) {
      return getInitialTheme(null, prefersDark);
    }
  }

  function saveTheme(storage, theme) {
    const normalizedTheme = normalizeTheme(theme);

    if (normalizedTheme === null) {
      return { ok: false, error: new TypeError("Invalid theme.") };
    }

    try {
      storage.setItem(THEME_STORAGE_KEY, normalizedTheme);
      return { ok: true, error: null };
    } catch (error) {
      return { ok: false, error: error };
    }
  }

  return {
    THEME_STORAGE_KEY: THEME_STORAGE_KEY,
    LIGHT_THEME: LIGHT_THEME,
    DARK_THEME: DARK_THEME,
    normalizeTheme: normalizeTheme,
    getInitialTheme: getInitialTheme,
    loadTheme: loadTheme,
    saveTheme: saveTheme
  };
});
