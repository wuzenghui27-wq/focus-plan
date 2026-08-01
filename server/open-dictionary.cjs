const CHINESE_CHARACTER_PATTERN = /[\u3400-\u9fff\uf900-\ufaff]/;

function createHttpError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function unique(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function getChineseTranslations(entries) {
  return unique(entries.map(function (entry) {
    return entry.simplified;
  })).slice(0, 4);
}

function getEnglishHeadword(entries) {
  for (const entry of entries) {
    for (const definition of entry.definitions) {
      const candidate = definition
        .replace(/\([^)]*\)/g, "")
        .replace(/^to\s+/, "")
        .split(/[;,]/)[0]
        .trim();
      if (/^[a-z][a-z '\-]+$/i.test(candidate)) {
        return candidate.toLowerCase();
      }
    }
  }
  return "";
}

function parseEnglishPayload(payload, translations) {
  const words = Array.isArray(payload) ? payload : [];
  const entries = [];
  const chineseSummary = translations.join("、");

  for (const word of words) {
    for (const meaning of Array.isArray(word.meanings) ? word.meanings : []) {
      const definitions = (Array.isArray(meaning.definitions)
        ? meaning.definitions
        : []).slice(0, 3).map(function (definition, index) {
        return {
          english: String(definition.definition || "").trim(),
          chinese: chineseSummary,
          example: String(definition.example || "").trim()
        };
      }).filter(function (definition) {
        return definition.english;
      });

      if (definitions.length > 0) {
        entries.push({
          partOfSpeech: String(meaning.partOfSpeech || "").trim(),
          meanings: definitions
        });
      }
    }
  }

  return entries.slice(0, 4);
}

function getPhonetic(payload) {
  for (const word of Array.isArray(payload) ? payload : []) {
    if (word.phonetic) {
      return String(word.phonetic);
    }
    const phonetic = (Array.isArray(word.phonetics) ? word.phonetics : [])
      .find(function (item) {
        return item.text;
      });
    if (phonetic) {
      return String(phonetic.text);
    }
  }
  return "";
}

function createFallbackEntries(cedictEntries, chineseQuery) {
  const meanings = unique(cedictEntries.flatMap(function (entry) {
    return entry.definitions;
  })).slice(0, 3).map(function (definition) {
    return {
      english: definition,
      chinese: chineseQuery || getChineseTranslations(cedictEntries)[0] || "",
      example: ""
    };
  });

  return meanings.length > 0
    ? [{ partOfSpeech: "translation", meanings }]
    : [];
}

function createOpenDictionary(options) {
  const cedict = options.cedict;
  const englishProvider = options.englishProvider;

  function isConfigured() {
    return true;
  }

  async function lookup(rawQuery) {
    const query = String(rawQuery || "").trim().replace(/\s+/g, " ");
    if (!query || Array.from(query).length > 60) {
      throw createHttpError("请输入 1 至 60 个字符。", 400);
    }

    const isChinese = CHINESE_CHARACTER_PATTERN.test(query);
    const cedictEntries = isChinese
      ? cedict.findChinese(query)
      : cedict.findEnglish(query);
    const headword = isChinese ? getEnglishHeadword(cedictEntries) : query.toLowerCase();

    if (!headword) {
      throw createHttpError("没有在开源词典中找到这个词。", 404);
    }

    let payload = [];
    let providerError = null;
    try {
      payload = await englishProvider.lookup(headword);
    } catch (error) {
      providerError = error;
    }

    const translations = isChinese
      ? [query]
      : getChineseTranslations(cedictEntries);
    let entries = parseEnglishPayload(payload, translations);

    if (entries.length === 0) {
      entries = createFallbackEntries(cedictEntries, isChinese ? query : "");
    }
    if (entries.length === 0) {
      throw providerError || createHttpError("没有找到这个词。", 404);
    }

    return {
      query,
      direction: isChinese ? "zh-en" : "en-zh",
      headword,
      phonetic: getPhonetic(payload),
      entries,
      provider: payload.length > 0
        ? "CC-CEDICT · Free Dictionary API"
        : "CC-CEDICT"
    };
  }

  return { isConfigured, lookup };
}

module.exports = {
  createOpenDictionary,
  parseEnglishPayload,
  getEnglishHeadword
};
