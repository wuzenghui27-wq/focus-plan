(function (root, factory) {
  const tools = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = tools;
  }

  root.StorageTools = tools;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function loadJsonArray(storage, key, normalizeItems) {
    try {
      const savedValue = storage.getItem(key);

      if (savedValue === null) {
        return { items: [], recovered: false, error: null };
      }

      const parsedValue = JSON.parse(savedValue);

      if (!Array.isArray(parsedValue)) {
        throw new TypeError("Stored value must be an array.");
      }

      const items = normalizeItems
        ? normalizeItems(parsedValue)
        : parsedValue;

      if (!Array.isArray(items)) {
        throw new TypeError("Normalized value must be an array.");
      }

      return { items: items, recovered: false, error: null };
    } catch (error) {
      try {
        storage.removeItem(key);
      } catch (removeError) {
        console.error("Failed to remove invalid stored data.", removeError);
      }

      return { items: [], recovered: true, error: error };
    }
  }

  function saveJson(storage, key, value) {
    try {
      storage.setItem(key, JSON.stringify(value));
      return { ok: true, error: null };
    } catch (error) {
      return { ok: false, error: error };
    }
  }

  return {
    loadJsonArray: loadJsonArray,
    saveJson: saveJson
  };
});
