const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { convert } = require("html-to-text");

function createHttpError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function toPlainText(value) {
  return convert(String(value || ""), {
    wordwrap: false,
    selectors: [{ selector: "a", options: { ignoreHref: true } }]
  }).replace(/\s+/g, " ").trim();
}

function normalizeWiktionaryPayload(word, payload) {
  const englishEntries = Array.isArray(payload?.en) ? payload.en : [];

  for (const entry of englishEntries) {
    const definitions = (Array.isArray(entry.definitions)
      ? entry.definitions
      : []).map(function (definition) {
      return {
        definition: toPlainText(definition.definition),
        example: toPlainText(
          definition.parsedExamples?.[0]?.example ||
          definition.examples?.[0] ||
          ""
        )
      };
    }).filter(function (definition) {
      return definition.definition;
    });

    if (definitions.length > 0) {
      return [{
        word,
        phonetic: "",
        meanings: [{
          partOfSpeech: String(entry.partOfSpeech || "").toLowerCase(),
          definitions
        }]
      }];
    }
  }

  return [];
}

function createWiktionaryProvider(options) {
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  const baseUrl = String(
    options.baseUrl || "https://en.wiktionary.org/api/rest_v1/page/definition"
  ).replace(/\/$/, "");
  const cacheDirectory = options.cacheDirectory;

  function getCachePath(word) {
    const key = crypto.createHash("sha256")
      .update("wiktionary:" + word)
      .digest("hex");
    return path.join(cacheDirectory, key + ".json");
  }

  function readCache(word) {
    const cachePath = getCachePath(word);
    return fs.existsSync(cachePath)
      ? JSON.parse(fs.readFileSync(cachePath, "utf8"))
      : null;
  }

  function writeCache(word, payload) {
    fs.mkdirSync(cacheDirectory, { recursive: true });
    fs.writeFileSync(getCachePath(word), JSON.stringify(payload), "utf8");
  }

  async function lookup(word) {
    const normalizedWord = String(word || "").toLowerCase().trim();
    const cached = readCache(normalizedWord);
    if (cached) {
      return cached;
    }

    let response;
    try {
      response = await fetchImpl(
        baseUrl + "/" + encodeURIComponent(normalizedWord),
        {
          headers: { "User-Agent": "FanP/1.0 (open dictionary project)" },
          signal: AbortSignal.timeout(5000)
        }
      );
    } catch (error) {
      throw createHttpError("备用英文词典暂时不可用。", 502);
    }

    if (response.status === 404) {
      throw createHttpError("没有找到这个英文词。", 404);
    }
    if (!response.ok) {
      throw createHttpError("备用英文词典暂时不可用。", 502);
    }

    const payload = normalizeWiktionaryPayload(
      normalizedWord,
      await response.json()
    );
    if (payload.length === 0) {
      throw createHttpError("没有找到可展示的英文释义。", 404);
    }

    writeCache(normalizedWord, payload);
    return payload;
  }

  return { lookup };
}

module.exports = {
  createWiktionaryProvider,
  normalizeWiktionaryPayload,
  toPlainText
};
