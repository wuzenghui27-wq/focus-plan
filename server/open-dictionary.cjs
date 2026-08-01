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
  })).slice(0, 1);
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

function inferPreferredPartOfSpeech(entries) {
  return entries.some(function (entry) {
    return entry.definitions.some(function (definition) {
      return definition.split(/[;,]/).some(function (phrase) {
        return /^to\s+/i.test(phrase.trim());
      });
    });
  }) ? "verb" : "";
}

function getPrimaryMeaning(payload, preferredPartOfSpeech) {
  const meanings = (Array.isArray(payload) ? payload : []).flatMap(
    function (word) {
      return Array.isArray(word.meanings) ? word.meanings : [];
    }
  ).filter(function (meaning) {
    return (Array.isArray(meaning.definitions) ? meaning.definitions : [])
      .some(function (definition) {
        return String(definition.definition || "").trim();
      });
  });

  return meanings.find(function (meaning) {
    return String(meaning.partOfSpeech || "").toLowerCase() ===
      preferredPartOfSpeech;
  }) || meanings[0] || null;
}

function parseEnglishPayload(
  payload,
  translations,
  fallbackExample,
  preferredPartOfSpeech
) {
  const meaning = getPrimaryMeaning(payload, preferredPartOfSpeech);
  const definition = (Array.isArray(meaning?.definitions)
    ? meaning.definitions
    : []).find(function (item) {
    return String(item.definition || "").trim();
  });

  if (!definition) {
    return [];
  }

  return [{
    partOfSpeech: String(meaning.partOfSpeech || "").trim(),
    meanings: [{
      english: String(definition.definition).trim(),
      chinese: translations[0] || "",
      example: String(definition.example || fallbackExample || "").trim()
    }]
  }];
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

function getFirstExample(payload, preferredPartOfSpeech) {
  const meaning = getPrimaryMeaning(payload, preferredPartOfSpeech);
  const definition = (Array.isArray(meaning?.definitions)
    ? meaning.definitions
    : []).find(function (item) {
    return String(item.definition || "").trim();
  });
  return String(definition?.example || "").trim();
}

function createOpenDictionary(options) {
  const cedict = options.cedict;
  const englishProvider = options.englishProvider;
  const fallbackEnglishProvider = options.fallbackEnglishProvider;
  const exampleProvider = options.exampleProvider;

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

    let payload;
    let englishSource = "Free Dictionary API";
    try {
      payload = await englishProvider.lookup(headword);
    } catch (primaryError) {
      if (!fallbackEnglishProvider) {
        throw primaryError;
      }
      payload = await fallbackEnglishProvider.lookup(headword);
      englishSource = "Wiktionary";
    }

    const preferredPartOfSpeech = inferPreferredPartOfSpeech(cedictEntries);
    const builtInExample = getFirstExample(payload, preferredPartOfSpeech);
    const fallbackExample = !builtInExample && exampleProvider
      ? await exampleProvider.findExample(headword)
      : "";

    const translations = isChinese
      ? [query]
      : getChineseTranslations(cedictEntries);
    const entries = parseEnglishPayload(
      payload,
      translations,
      fallbackExample,
      preferredPartOfSpeech
    );
    if (entries.length === 0) {
      throw createHttpError("没有找到可展示的核心释义。", 404);
    }

    return {
      query,
      direction: isChinese ? "zh-en" : "en-zh",
      headword,
      phonetic: getPhonetic(payload),
      entries,
      provider: "CC-CEDICT · " + englishSource +
        (fallbackExample ? " · Tatoeba" : "")
    };
  }

  return { isConfigured, lookup };
}

module.exports = {
  createOpenDictionary,
  parseEnglishPayload,
  getEnglishHeadword,
  getFirstExample,
  inferPreferredPartOfSpeech
};
