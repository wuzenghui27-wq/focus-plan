const CHINESE_CHARACTER_PATTERN = /[\u3400-\u9fff\uf900-\ufaff]/;
const {
  getChineseTranslation
} = require("./ecdict-provider.cjs");
const { getCoreTranslation } = require("./core-translations.cjs");

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
  return getEnglishHeadwordCandidates(entries)[0] || "";
}

function getEnglishHeadwordCandidates(entries) {
  const candidates = [];
  for (const entry of entries) {
    for (const definition of entry.definitions) {
      for (const phrase of definition.split(/[;,]/)) {
        const candidate = phrase
        .replace(/\([^)]*\)/g, "")
        .trim()
        .replace(/^to\s+/, "")
        .trim();
        if (/^[a-z][a-z '\-]+$/i.test(candidate)) {
          candidates.push(candidate.toLowerCase());
        }
      }
    }
  }
  return unique(candidates).map(function (candidate, index) {
    return { candidate, index };
  }).sort(function (left, right) {
    const leftWords = left.candidate.match(/[a-z]+/g)?.length || 0;
    const rightWords = right.candidate.match(/[a-z]+/g)?.length || 0;
    return (leftWords === 1 ? 0 : 1) - (rightWords === 1 ? 0 : 1) ||
      left.index - right.index;
  }).map(function (item) {
    return item.candidate;
  });
}

function inferPreferredPartOfSpeech(entries) {
  const bestEntry = entries[0];
  const firstDefinition = (bestEntry?.definitions?.[0] || "")
    .replace(/\([^)]*\)/g, "")
    .trim();
  const firstPhrase = firstDefinition.split(/[;,]/)[0].trim();
  return /^to\s+/i.test(firstPhrase) ? "verb" : "";
}

function getGlossKeywords(entries, headword) {
  let relatedCandidates = [];
  for (const entry of entries) {
    for (const definition of entry.definitions) {
      const candidates = getEnglishHeadwordCandidates([{
        definitions: [definition]
      }]);
      if (candidates.includes(headword)) {
        relatedCandidates = candidates;
        break;
      }
    }
    if (relatedCandidates.length > 0) {
      break;
    }
  }

  return unique(relatedCandidates.flatMap(
    function (candidate) {
      return candidate.match(/[a-z]+/g) || [];
    }
  )).filter(function (word) {
    return word.length >= 4 && word !== "this" && word !== "that" &&
      word !== "with" && word !== "from" && word !== "used" &&
      word !== "only" && word !== headword;
  });
}

function isInflectionDefinition(definition) {
  return /^(simple past|past participle|plural|comparative|superlative)\b/i
    .test(String(definition || "").trim());
}

function getBestDefinition(meaning, keywords) {
  const definitions = (Array.isArray(meaning?.definitions)
    ? meaning.definitions
    : []).filter(function (definition) {
    return String(definition.definition || "").trim();
  });
  if (definitions.length < 2 || keywords.length === 0) {
    return definitions[0];
  }

  return definitions.slice().sort(function (left, right) {
    function score(item) {
      const text = String(item.definition || "").toLowerCase();
      return keywords.reduce(function (total, keyword) {
        return total + (text.includes(keyword) ? 1 : 0);
      }, 0);
    }
    return score(right) - score(left);
  })[0];
}

function getPrimaryMeaning(payload, preferredPartOfSpeech, keywords) {
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

  const matchingMeanings = meanings.filter(function (meaning) {
    return String(meaning.partOfSpeech || "").toLowerCase() ===
      preferredPartOfSpeech;
  });
  const candidates = matchingMeanings.length > 0 ? matchingMeanings : meanings;
  const semanticKeywords = keywords || [];

  if (semanticKeywords.length === 0) {
    return candidates[0] || null;
  }
  return candidates.slice().sort(function (left, right) {
    function score(meaning) {
      const text = (meaning.definitions || []).map(function (definition) {
        return String(definition.definition || "").toLowerCase();
      }).join(" ");
      return semanticKeywords.reduce(function (total, keyword) {
        return total + (text.includes(keyword) ? 1 : 0);
      }, 0);
    }
    return score(right) - score(left);
  })[0] || null;
}

function parseEnglishPayload(
  payload,
  translations,
  fallbackExample,
  preferredPartOfSpeech,
  glossKeywords
) {
  const meaning = getPrimaryMeaning(
    payload,
    preferredPartOfSpeech,
    glossKeywords
  );
  const definition = getBestDefinition(meaning, glossKeywords || []);

  if (!definition) {
    return [];
  }

  return [{
    partOfSpeech: String(meaning.partOfSpeech || "").trim(),
    meanings: [{
      english: String(definition.definition).trim(),
      chinese: translations[0] || "",
      example: String(
        isUsefulExample(definition.example)
          ? definition.example
          : fallbackExample || ""
      ).trim()
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

function getFirstExample(payload, preferredPartOfSpeech, keywords) {
  const meaning = getPrimaryMeaning(payload, preferredPartOfSpeech, keywords);
  const definition = getBestDefinition(meaning, keywords || []);
  return isUsefulExample(definition?.example)
    ? String(definition.example).trim()
    : "";
}

function isUsefulExample(example) {
  const text = String(example || "").trim();
  const words = text.match(/[A-Za-z]+(?:'[A-Za-z]+)?/g) || [];
  return words.length >= 4 && /[.!?]$/.test(text);
}

function createOpenDictionary(options) {
  const cedict = options.cedict;
  const englishProvider = options.englishProvider;
  const fallbackEnglishProvider = options.fallbackEnglishProvider;
  const exampleProvider = options.exampleProvider;
  const translationProvider = options.translationProvider;
  const primarySourceName = options.englishProviderName || "Free Dictionary API";
  const fallbackSourceName = options.fallbackEnglishProviderName || "Wiktionary";

  function isConfigured() {
    return true;
  }

  async function lookup(rawQuery) {
    const query = String(rawQuery || "").trim().replace(/\s+/g, " ");
    if (!query || Array.from(query).length > 60) {
      throw createHttpError("请输入 1 至 60 个字符。", 400);
    }

    const isChinese = CHINESE_CHARACTER_PATTERN.test(query);
    let cedictEntries = isChinese
      ? cedict.findChinese(query)
      : cedict.findEnglish(query);
    const translationEntry = !isChinese && translationProvider
      ? translationProvider.lookup(query)
      : null;
    const coreTranslation = !isChinese
      ? getCoreTranslation(query, translationEntry?.lemma)
      : null;
    if (isChinese && cedictEntries.length === 0 && query.length > 1 &&
        /[了过着]$/.test(query)) {
      cedictEntries = cedict.findChinese(query.slice(0, -1));
    }
    const headwordCandidates = isChinese
      ? getEnglishHeadwordCandidates(cedictEntries)
      : [query.toLowerCase()];
    let headword = headwordCandidates[0] || "";

    if (!headword) {
      throw createHttpError("没有在开源词典中找到这个词。", 404);
    }

    let payload;
    let englishSource = primarySourceName;
    async function lookupEnglish(candidate) {
      try {
        return {
          payload: await englishProvider.lookup(candidate),
          source: primarySourceName
        };
      } catch (primaryError) {
        if (!fallbackEnglishProvider) {
          throw primaryError;
        }
        return {
          payload: await fallbackEnglishProvider.lookup(candidate),
          source: fallbackSourceName
        };
      }
    }

    const preferredPartOfSpeech = isChinese
      ? inferPreferredPartOfSpeech(cedictEntries)
      : coreTranslation?.partOfSpeech || "";
    let lookupResult;
    let lookupError;
    for (const candidate of headwordCandidates) {
      try {
        lookupResult = await lookupEnglish(candidate);
        headword = candidate;
        break;
      } catch (error) {
        lookupError = error;
        if (!isChinese) {
          throw error;
        }
      }
    }
    if (!lookupResult) {
      throw lookupError;
    }
    payload = lookupResult.payload;
    englishSource = lookupResult.source;
    if (isChinese && isInflectionDefinition(
      getBestDefinition(
        getPrimaryMeaning(payload, preferredPartOfSpeech),
        getGlossKeywords(cedictEntries, headword)
      )?.definition
    )) {
      for (const candidate of headwordCandidates.filter(function (item) {
        return item !== headword;
      })) {
        let alternative;
        try {
          alternative = await lookupEnglish(candidate);
        } catch (error) {
          continue;
        }
        const definition = getBestDefinition(
          getPrimaryMeaning(alternative.payload, preferredPartOfSpeech),
          getGlossKeywords(cedictEntries, candidate)
        );
        if (definition && !isInflectionDefinition(definition.definition)) {
          headword = candidate;
          payload = alternative.payload;
          englishSource = alternative.source;
          break;
        }
      }
    }
    const meaningKeywords = isChinese
      ? getGlossKeywords(cedictEntries, headword)
      : coreTranslation?.keywords || [];
    const builtInExample = getFirstExample(
      payload,
      preferredPartOfSpeech,
      meaningKeywords
    );
    const fallbackExample = !builtInExample && exampleProvider
      ? await exampleProvider.findExample(headword)
      : "";
    const selectedMeaning = getPrimaryMeaning(
      payload,
      preferredPartOfSpeech,
      meaningKeywords
    );
    const selectedPartOfSpeech = String(
      selectedMeaning?.partOfSpeech || preferredPartOfSpeech
    ).toLowerCase();
    const ecdictTranslation = getChineseTranslation(
      translationEntry,
      selectedPartOfSpeech
    );

    const translations = isChinese
      ? [query]
      : [coreTranslation?.chinese || ecdictTranslation]
        .filter(Boolean)
        .concat(getChineseTranslations(cedictEntries));
    const entries = parseEnglishPayload(
      payload,
      translations,
      fallbackExample,
      preferredPartOfSpeech,
      meaningKeywords
    );
    if (entries.length === 0) {
      throw createHttpError("没有找到可展示的核心释义。", 404);
    }

    return {
      query,
      direction: isChinese ? "zh-en" : "en-zh",
      headword,
      phonetic: getPhonetic(payload) || String(translationEntry?.phonetic || ""),
      entries,
      provider: (translationEntry ? "ECDICT · " : "CC-CEDICT · ") +
        englishSource +
        (fallbackExample ? " · Tatoeba" : "")
    };
  }

  return { isConfigured, lookup };
}

module.exports = {
  createOpenDictionary,
  parseEnglishPayload,
  getEnglishHeadword,
  getEnglishHeadwordCandidates,
  getFirstExample,
  inferPreferredPartOfSpeech
};
