const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

function createHttpError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function createFreeDictionaryProvider(options) {
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  const baseUrl = String(
    options.baseUrl || "https://api.dictionaryapi.dev/api/v2/entries/en"
  ).replace(/\/$/, "");
  const cacheDirectory = options.cacheDirectory;

  function getCachePath(word) {
    const key = crypto.createHash("sha256").update(word).digest("hex");
    return path.join(cacheDirectory, key + ".json");
  }

  function readCache(word) {
    const cachePath = getCachePath(word);
    if (!fs.existsSync(cachePath)) {
      return null;
    }
    return JSON.parse(fs.readFileSync(cachePath, "utf8"));
  }

  function writeCache(word, payload) {
    fs.mkdirSync(cacheDirectory, { recursive: true });
    fs.writeFileSync(getCachePath(word), JSON.stringify(payload), "utf8");
  }

  async function retryFetch(url, init) {
    let lastError;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const response = await fetchImpl(url, {
          ...init,
          signal: AbortSignal.timeout(5000)
        });
        if (response.ok || response.status === 404 || attempt === 1) {
          return response;
        }
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError || new Error("Dictionary request failed");
  }

  async function lookup(word) {
    const normalizedWord = String(word || "").toLowerCase().trim();
    const cached = readCache(normalizedWord);
    if (cached) {
      return cached;
    }

    let response;
    try {
      response = await retryFetch(
        baseUrl + "/" + encodeURIComponent(normalizedWord),
        { signal: AbortSignal.timeout(5000) }
      );
    } catch (error) {
      throw createHttpError("无法连接开源英文词典，请检查网络后重试。", 502);
    }

    if (response.status === 404) {
      throw createHttpError("没有找到这个英文词。", 404);
    }
    if (!response.ok) {
      throw createHttpError("开源英文词典暂时不可用。", 502);
    }

    const payload = await response.json();
    writeCache(normalizedWord, payload);
    return payload;
  }

  return { lookup };
}

module.exports = { createFreeDictionaryProvider };
