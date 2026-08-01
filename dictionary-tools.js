(function (root, factory) {
  const tools = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = tools;
  }

  root.DictionaryTools = tools;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const MAX_QUERY_LENGTH = 60;
  const CHINESE_CHARACTER_PATTERN = /[\u3400-\u9fff\uf900-\ufaff]/;

  function normalizeQuery(value) {
    return String(value || "").trim().replace(/\s+/g, " ");
  }

  function detectDirection(value) {
    return CHINESE_CHARACTER_PATTERN.test(normalizeQuery(value))
      ? "zh-en"
      : "en-zh";
  }

  function validateQuery(value) {
    const query = normalizeQuery(value);

    if (query === "") {
      return { valid: false, message: "请输入要查询的词。" };
    }

    if (Array.from(query).length > MAX_QUERY_LENGTH) {
      return { valid: false, message: "查询内容不能超过 60 个字符。" };
    }

    return {
      valid: true,
      value: query,
      direction: detectDirection(query)
    };
  }

  function normalizeMeaning(meaning) {
    return {
      english: String(meaning?.english || "").trim(),
      chinese: String(meaning?.chinese || "").trim(),
      example: String(meaning?.example || "").trim()
    };
  }

  function normalizeLookupResult(value) {
    const result = value && typeof value === "object" ? value : {};
    const entries = Array.isArray(result.entries)
      ? result.entries.map(function (entry) {
        return {
          partOfSpeech: String(entry?.partOfSpeech || "").trim(),
          meanings: Array.isArray(entry?.meanings)
            ? entry.meanings.map(normalizeMeaning).filter(function (meaning) {
              return meaning.english || meaning.chinese || meaning.example;
            })
            : []
        };
      }).filter(function (entry) {
        return entry.meanings.length > 0;
      })
      : [];

    return {
      query: normalizeQuery(result.query),
      direction: result.direction === "zh-en" ? "zh-en" : "en-zh",
      headword: String(result.headword || result.query || "").trim(),
      phonetic: String(result.phonetic || "").trim(),
      entries: entries,
      provider: String(result.provider || "开源词典").trim()
    };
  }

  return {
    MAX_QUERY_LENGTH: MAX_QUERY_LENGTH,
    normalizeQuery: normalizeQuery,
    detectDirection: detectDirection,
    validateQuery: validateQuery,
    normalizeLookupResult: normalizeLookupResult
  };
});
