const fs = require("fs");
const zlib = require("zlib");

const CEDICT_LINE_PATTERN = /^(\S+)\s+(\S+)\s+\[([^\]]+)]\s+\/(.+)\/$/;

function normalizeEnglish(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/^to\s+/, "")
    .replace(/[^a-z0-9' -]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseCedictLine(line) {
  const match = CEDICT_LINE_PATTERN.exec(String(line || "").trim());

  if (!match || line.startsWith("#")) {
    return null;
  }

  return {
    traditional: match[1],
    simplified: match[2],
    pinyin: match[3],
    definitions: match[4].split("/").map(function (definition) {
      return definition.trim();
    }).filter(Boolean)
  };
}

function addToIndex(index, key, entry) {
  if (!key) {
    return;
  }
  const values = index.get(key) || [];
  values.push(entry);
  index.set(key, values);
}

function createCedictStore(options) {
  const filePath = options.filePath;
  const getFrequencyRank = options.getFrequencyRank || function () {
    return Number.POSITIVE_INFINITY;
  };
  let loaded = false;
  let chineseIndex = new Map();
  let englishIndex = new Map();

  function isAvailable() {
    return fs.existsSync(filePath);
  }

  function load() {
    if (loaded) {
      return;
    }
    loaded = true;

    if (!isAvailable()) {
      return;
    }

    const compressed = fs.readFileSync(filePath);
    const source = zlib.gunzipSync(compressed).toString("utf8");

    for (const line of source.split(/\r?\n/)) {
      const entry = parseCedictLine(line);
      if (!entry) {
        continue;
      }

      addToIndex(chineseIndex, entry.simplified, entry);
      if (entry.traditional !== entry.simplified) {
        addToIndex(chineseIndex, entry.traditional, entry);
      }

      for (const definition of entry.definitions) {
        for (const phrase of definition.split(/[;,]/)) {
          const normalized = normalizeEnglish(phrase);
          if (normalized && normalized.length <= 60) {
            addToIndex(englishIndex, normalized, entry);
          }
        }
      }
    }
  }

  function findChinese(query) {
    load();
    return (chineseIndex.get(String(query || "").trim()) || []).slice(0, 8);
  }

  function findEnglish(query) {
    load();
    const normalizedQuery = normalizeEnglish(query);
    const matches = englishIndex.get(normalizedQuery) || [];

    return matches.slice().sort(function (left, right) {
      function score(entry) {
        const matchingDefinitions = [];
        let relevancePenalty = 100;

        entry.definitions.forEach(function (definition, definitionIndex) {
          definition.split(/[;,]/).forEach(function (phrase, phraseIndex) {
            if (normalizeEnglish(phrase) !== normalizedQuery) {
              return;
            }
            matchingDefinitions.push(definition);
            const wholeDefinitionMatches =
              normalizeEnglish(definition) === normalizedQuery;
            relevancePenalty = Math.min(
              relevancePenalty,
              (wholeDefinitionMatches ? 0 : 8) +
                definitionIndex * 12 + phraseIndex * 6
            );
          });
        });
        const parentheticalPenalty = matchingDefinitions.some(function (definition) {
          return definition.includes("(");
        }) ? 4 : 0;
        const properNamePenalty = matchingDefinitions.some(function (definition) {
          return /^[A-Z]/.test(definition);
        }) ? 8 : 0;
        const rank = Number(getFrequencyRank(entry.simplified));
        const frequencyPenalty = Number.isFinite(rank)
          ? Math.log10(rank + 1) * 4
          : 32;
        const uncommonSingleCharacterPenalty = !Number.isFinite(rank) &&
          Array.from(entry.simplified).length === 1 ? 12 : 0;

        return relevancePenalty + entry.definitions.length +
          parentheticalPenalty + properNamePenalty + frequencyPenalty +
          uncommonSingleCharacterPenalty;
      }

      return score(left) - score(right);
    }).slice(0, 8);
  }

  return { isAvailable, findChinese, findEnglish };
}

module.exports = { createCedictStore, parseCedictLine, normalizeEnglish };
