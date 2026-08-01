const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

function createTatoebaProvider(options) {
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  const baseUrl = String(
    options.baseUrl || "https://api.tatoeba.org/v1/sentences"
  ).replace(/\/$/, "");
  const cacheDirectory = options.cacheDirectory;

  function getCachePath(word) {
    const key = crypto.createHash("sha256")
      .update("example:" + word)
      .digest("hex");
    return path.join(cacheDirectory, key + ".json");
  }

  function readCache(word) {
    const cachePath = getCachePath(word);
    if (!fs.existsSync(cachePath)) {
      return "";
    }
    return String(JSON.parse(fs.readFileSync(cachePath, "utf8")).example || "");
  }

  function writeCache(word, example) {
    fs.mkdirSync(cacheDirectory, { recursive: true });
    fs.writeFileSync(
      getCachePath(word),
      JSON.stringify({ example }),
      "utf8"
    );
  }

  async function findExample(word) {
    const normalizedWord = String(word || "").toLowerCase().trim();
    const cached = readCache(normalizedWord);
    if (cached) {
      return cached;
    }

    const parameters = new URLSearchParams({
      lang: "eng",
      q: "=" + normalizedWord,
      word_count: "5-12",
      sort: "relevance",
      limit: "10"
    });

    try {
      const response = await fetchImpl(baseUrl + "?" + parameters, {
        signal: AbortSignal.timeout(5000)
      });
      if (!response.ok) {
        return "";
      }

      const payload = await response.json();
      const sentence = (Array.isArray(payload.data) ? payload.data : [])
        .find(function (item) {
          return !item.is_unapproved && String(item.text || "").trim();
        });
      const example = String(sentence?.text || "").trim();
      if (example) {
        writeCache(normalizedWord, example);
      }
      return example;
    } catch (error) {
      return "";
    }
  }

  return { findExample };
}

module.exports = { createTatoebaProvider };
