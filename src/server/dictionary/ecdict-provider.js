import ecdict from "ecdict";

const { searchWord } = ecdict;

const PART_OF_SPEECH_MAP = {
  a: "adjective",
  ad: "adverb",
  adv: "adverb",
  n: "noun",
  r: "adverb",
  s: "adjective",
  v: "verb",
  vi: "verb",
  vt: "verb"
};

function getLinePartOfSpeech(line) {
  const match = /^([a-z]+)\.\s*/i.exec(String(line || "").trim());
  return match ? PART_OF_SPEECH_MAP[match[1].toLowerCase()] || "" : "";
}

function splitLines(value) {
  return String(value || "").replace(/\\n/g, "\n").split(/\r?\n/);
}

function getPrimaryPartOfSpeech(entry) {
  for (const source of [entry?.definition, entry?.translation]) {
    for (const line of splitLines(source)) {
      const partOfSpeech = getLinePartOfSpeech(line);
      if (partOfSpeech) {
        return partOfSpeech;
      }
    }
  }
  return "";
}

function cleanTranslation(value) {
  return String(value || "")
    .replace(/^\[[^\]]+]\s*/, "")
    .replace(/^[a-z]+\.\s*/i, "")
    .replace(/\([^)]*\)/g, "")
    .trim();
}

function getChineseTranslation(entry, preferredPartOfSpeech) {
  const lines = splitLines(entry?.translation)
    .map(function (line) {
      return { line, partOfSpeech: getLinePartOfSpeech(line) };
    })
    .filter(function (item) {
      return item.line.trim();
    });
  const matchingLines = preferredPartOfSpeech
    ? lines.filter(function (item) {
      return item.partOfSpeech === preferredPartOfSpeech;
    })
    : [];
  const selectedLine = matchingLines[0]?.line || lines[0]?.line || "";

  return cleanTranslation(selectedLine).split(/[,，;；]/)[0].trim();
}

function createEcdictProvider() {
  function lookup(rawWord) {
    const word = String(rawWord || "").toLowerCase().trim();
    return word
      ? searchWord(word, { caseInsensitive: true }) || null
      : null;
  }

  return { lookup };
}

export {
  createEcdictProvider,
  getChineseTranslation,
  getLinePartOfSpeech,
  getPrimaryPartOfSpeech,
  splitLines
};
