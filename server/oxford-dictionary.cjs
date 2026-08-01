const CHINESE_CHARACTER_PATTERN = /[\u3400-\u9fff\uf900-\ufaff]/;

function createHttpError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function getLexicalCategory(lexicalEntry) {
  return String(
    lexicalEntry?.lexicalCategory?.text ||
    lexicalEntry?.lexicalCategory?.id ||
    ""
  ).trim();
}

function flattenSenses(senses) {
  const flattened = [];

  for (const sense of Array.isArray(senses) ? senses : []) {
    flattened.push(sense);
    flattened.push(...flattenSenses(sense.subsenses));
  }

  return flattened;
}

function getLexicalEntries(payload) {
  return (Array.isArray(payload?.results) ? payload.results : [])
    .flatMap(function (result) {
      return Array.isArray(result.lexicalEntries) ? result.lexicalEntries : [];
    });
}

function getTranslationsByPartOfSpeech(payload) {
  const translations = new Map();

  for (const lexicalEntry of getLexicalEntries(payload)) {
    const partOfSpeech = getLexicalCategory(lexicalEntry).toLowerCase();
    const words = (Array.isArray(lexicalEntry.entries)
      ? lexicalEntry.entries
      : []).flatMap(function (entry) {
        return flattenSenses(entry.senses).flatMap(function (sense) {
          return (Array.isArray(sense.translations)
            ? sense.translations
            : []).map(function (translation) {
            return String(translation.text || "").trim();
          });
        });
      }).filter(Boolean);

    if (words.length > 0) {
      translations.set(
        partOfSpeech,
        Array.from(new Set([...(translations.get(partOfSpeech) || []), ...words]))
      );
    }
  }

  return translations;
}

function getFirstTranslation(payload) {
  for (const words of getTranslationsByPartOfSpeech(payload).values()) {
    if (words[0]) {
      return words[0];
    }
  }
  return "";
}

function getSentencesByPartOfSpeech(payload) {
  const sentences = new Map();

  for (const lexicalEntry of getLexicalEntries(payload)) {
    const partOfSpeech = getLexicalCategory(lexicalEntry).toLowerCase();
    const examples = (Array.isArray(lexicalEntry.sentences)
      ? lexicalEntry.sentences
      : []).map(function (sentence) {
      return String(sentence.text || "").trim();
    }).filter(Boolean);

    if (examples.length > 0) {
      sentences.set(partOfSpeech, examples);
    }
  }

  return sentences;
}

function parseEnglishEntries(
  payload,
  translations,
  fallbackChinese,
  sentenceExamples
) {
  const examplesByPartOfSpeech = sentenceExamples || new Map();

  return getLexicalEntries(payload).map(function (lexicalEntry) {
    const partOfSpeech = getLexicalCategory(lexicalEntry);
    const normalizedPartOfSpeech = partOfSpeech.toLowerCase();
    const translatedWords = translations.get(partOfSpeech.toLowerCase()) || [];
    const fallbackExamples = examplesByPartOfSpeech.get(
      normalizedPartOfSpeech
    ) || [];
    const meanings = (Array.isArray(lexicalEntry.entries)
      ? lexicalEntry.entries
      : []).flatMap(function (entry) {
        return flattenSenses(entry.senses).map(function (sense, index) {
          return {
            english: String(sense.definitions?.[0] || "").trim(),
            chinese: translatedWords[index] || translatedWords[0] ||
              fallbackChinese,
            example: String(
              sense.examples?.[0]?.text ||
              fallbackExamples[index] ||
              fallbackExamples[0] ||
              ""
            ).trim()
          };
        });
      }).filter(function (meaning) {
        return meaning.english || meaning.chinese || meaning.example;
      }).slice(0, 3);

    return { partOfSpeech: partOfSpeech, meanings: meanings };
  }).filter(function (entry) {
    return entry.meanings.length > 0;
  }).slice(0, 4);
}

function getPhonetic(payload) {
  for (const lexicalEntry of getLexicalEntries(payload)) {
    for (const entry of Array.isArray(lexicalEntry.entries)
      ? lexicalEntry.entries
      : []) {
      const phonetic = entry.pronunciations?.find(function (pronunciation) {
        return pronunciation.phoneticSpelling;
      })?.phoneticSpelling;

      if (phonetic) {
        return String(phonetic);
      }
    }
  }
  return "";
}

function createOxfordDictionary(options) {
  const appId = String(options.appId || "").trim();
  const appKey = String(options.appKey || "").trim();
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  const baseUrl = String(
    options.baseUrl || "https://od-api.oxforddictionaries.com/api/v2"
  ).replace(/\/$/, "");

  function isConfigured() {
    return Boolean(appId && appKey);
  }

  async function fetchOxford(pathname) {
    let response;

    try {
      response = await fetchImpl(baseUrl + pathname, {
        headers: {
          Accept: "application/json",
          app_id: appId,
          app_key: appKey
        }
      });
    } catch (error) {
      throw createHttpError(
        "无法连接 Oxford 查词服务，请检查网络后重试。",
        502
      );
    }

    if (!response.ok) {
      if (response.status === 404) {
        if (baseUrl.includes("sandbox")) {
          throw createHttpError(
            "Oxford Sandbox 仅开放限定词表，可用 apple 或“同意”测试。",
            404
          );
        }
        throw createHttpError("没有找到这个词。", 404);
      }
      if ([401, 403].includes(response.status)) {
        throw createHttpError("Oxford API 凭据无效。", 503);
      }
      throw createHttpError("Oxford 查词服务暂时不可用。", 502);
    }

    return response.json();
  }

  async function lookup(rawQuery) {
    const query = String(rawQuery || "").trim().replace(/\s+/g, " ");

    if (!query || Array.from(query).length > 60) {
      throw createHttpError("请输入 1 至 60 个字符。", 400);
    }
    if (!isConfigured()) {
      throw createHttpError("词典服务尚未配置 Oxford API 凭据。", 503);
    }

    const isChinese = CHINESE_CHARACTER_PATTERN.test(query);
    const direction = isChinese ? "zh-en" : "en-zh";
    const source = isChinese ? "zh" : "en";
    const target = isChinese ? "en" : "zh";
    const translationPayload = await fetchOxford(
      "/translations/" + source + "/" + target + "/" +
      encodeURIComponent(query.toLowerCase())
    );
    const headword = isChinese
      ? getFirstTranslation(translationPayload)
      : query;

    if (!headword) {
      throw createHttpError("没有找到这个词。", 404);
    }

    const entryPayload = await fetchOxford(
      "/entries/en-gb/" + encodeURIComponent(headword.toLowerCase())
    );
    const translations = isChinese
      ? new Map()
      : getTranslationsByPartOfSpeech(translationPayload);
    let entries = parseEnglishEntries(
      entryPayload,
      translations,
      isChinese ? query : ""
    );

    const needsExamples = entries.some(function (entry) {
      return entry.meanings.some(function (meaning) {
        return !meaning.example;
      });
    });

    if (needsExamples) {
      let sentencePayload = {};
      try {
        sentencePayload = await fetchOxford(
          "/sentences/en-gb/" + encodeURIComponent(headword.toLowerCase())
        );
      } catch (error) {
        if (error.statusCode !== 404) {
          throw error;
        }
      }
      entries = parseEnglishEntries(
        entryPayload,
        translations,
        isChinese ? query : "",
        getSentencesByPartOfSpeech(sentencePayload)
      );
    }

    if (entries.length === 0) {
      throw createHttpError("暂时没有可展示的释义。", 404);
    }

    return {
      query: query,
      direction: direction,
      headword: headword,
      phonetic: getPhonetic(entryPayload),
      entries: entries,
      provider: "Oxford Languages"
    };
  }

  return { isConfigured: isConfigured, lookup: lookup };
}

module.exports = {
  createOxfordDictionary,
  getTranslationsByPartOfSpeech,
  getSentencesByPartOfSpeech,
  parseEnglishEntries,
  getFirstTranslation
};
