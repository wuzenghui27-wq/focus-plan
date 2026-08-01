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

function parseEnglishPayload(payload, translations, fallbackExample) {
  const words = Array.isArray(payload) ? payload : [];
  const chinese = translations[0] || "";

  for (const word of words) {
    for (const meaning of Array.isArray(word.meanings) ? word.meanings : []) {
      const definition = (Array.isArray(meaning.definitions)
        ? meaning.definitions
        : []).find(function (item) {
        return String(item.definition || "").trim();
      });

      if (definition) {
        return [{
          partOfSpeech: String(meaning.partOfSpeech || "").trim(),
          meanings: [{
            english: String(definition.definition).trim(),
            chinese,
            example: String(definition.example || fallbackExample || "").trim()
          }]
        }];
      }
    }
  }

  return [];
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

function createOpenDictionary(options) {
  const cedict = options.cedict;
  const englishProvider = options.englishProvider;
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

    const payload = await englishProvider.lookup(headword);
    const fallbackExample = exampleProvider
      ? await exampleProvider.findExample(headword)
      : "";

    const translations = isChinese
      ? [query]
      : getChineseTranslations(cedictEntries);
    const entries = parseEnglishPayload(payload, translations, fallbackExample);
    if (entries.length === 0) {
      throw createHttpError("没有找到可展示的核心释义。", 404);
    }

    return {
      query,
      direction: isChinese ? "zh-en" : "en-zh",
      headword,
      phonetic: getPhonetic(payload),
      entries,
      provider: fallbackExample
        ? "CC-CEDICT · Free Dictionary API · Tatoeba"
        : "CC-CEDICT · Free Dictionary API"
    };
  }

  return { isConfigured, lookup };
}

module.exports = {
  createOpenDictionary,
  parseEnglishPayload,
  getEnglishHeadword
};
