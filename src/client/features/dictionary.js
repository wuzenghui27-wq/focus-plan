import * as DictionaryTools from "../../domain/dictionary.js";
import { elements } from "../core/context.js";
import { createDictionaryApi } from "../services/dictionary-api.js";

const dictionaryApi = createDictionaryApi(window.fetch.bind(window), "/api");

const PART_OF_SPEECH_LABELS = {
  adjective: "形容词",
  adverb: "副词",
  conjunction: "连词",
  interjection: "感叹词",
  noun: "名词",
  preposition: "介词",
  pronoun: "代词",
  verb: "动词"
};

function getPartOfSpeechLabel(value) {
  const partOfSpeech = String(value || "").trim();
  const normalized = partOfSpeech.toLowerCase();
  const chineseLabel = PART_OF_SPEECH_LABELS[normalized];

  return chineseLabel
    ? chineseLabel + " · " + normalized
    : (partOfSpeech || "释义");
}

function updateDictionaryDirection() {
  const query = DictionaryTools.normalizeQuery(
    elements.dictionaryQueryInput.value
  );

  elements.dictionaryDirection.textContent = query === ""
    ? "自动识别"
    : (DictionaryTools.detectDirection(query) === "zh-en"
      ? "中 → 英"
      : "英 → 中");
}

function handleDictionaryQueryInput() {
  updateDictionaryDirection();
  elements.dictionaryResult.hidden = true;
  setDictionaryStatus("", "");
}

function setDictionaryStatus(message, type) {
  elements.dictionaryStatus.textContent = message;
  elements.dictionaryStatus.dataset.type = type || "";
}

function createDictionaryMeaning(meaning) {
  const item = document.createElement("div");
  const content = document.createElement("div");

  item.className = "dictionary-meaning";
  content.className = "dictionary-meaning-content";

  if (meaning.english) {
    const field = document.createElement("div");
    const label = document.createElement("span");
    const english = document.createElement("p");
    field.className = "dictionary-result-field";
    label.className = "dictionary-field-label";
    label.textContent = "英英释义";
    english.className = "dictionary-meaning-english";
    english.textContent = meaning.english;
    field.appendChild(label);
    field.appendChild(english);
    content.appendChild(field);
  }
  if (meaning.chinese) {
    const field = document.createElement("div");
    const label = document.createElement("span");
    const chinese = document.createElement("p");
    field.className = "dictionary-result-field";
    label.className = "dictionary-field-label";
    label.textContent = "中文意思";
    chinese.className = "dictionary-meaning-chinese";
    chinese.textContent = meaning.chinese;
    field.appendChild(label);
    field.appendChild(chinese);
    content.appendChild(field);
  }
  if (meaning.example) {
    const field = document.createElement("div");
    const label = document.createElement("span");
    const example = document.createElement("p");
    field.className = "dictionary-result-field";
    label.className = "dictionary-field-label";
    label.textContent = "英文例句";
    example.className = "dictionary-example";
    example.textContent = meaning.example;
    field.appendChild(label);
    field.appendChild(example);
    content.appendChild(field);
  }

  item.appendChild(content);
  return item;
}

function renderDictionaryResult(rawResult) {
  const result = DictionaryTools.normalizeLookupResult(rawResult);

  elements.dictionaryHeadword.textContent = result.headword;
  elements.dictionaryPhonetic.textContent = result.phonetic
    ? "/" + result.phonetic.replace(/^\/+|\/+$/g, "") + "/"
    : "";
  elements.dictionaryPhonetic.hidden = !result.phonetic;
  elements.dictionaryResultDirection.textContent = result.direction === "zh-en"
    ? "中 → 英"
    : "英 → 中";
  elements.dictionaryEntries.innerHTML = "";

  result.entries.forEach(function (entry) {
    const section = document.createElement("section");
    const heading = document.createElement("h4");

    section.className = "dictionary-entry";
    heading.textContent = getPartOfSpeechLabel(entry.partOfSpeech);
    section.appendChild(heading);
    entry.meanings.forEach(function (meaning) {
      section.appendChild(createDictionaryMeaning(meaning));
    });
    elements.dictionaryEntries.appendChild(section);
  });

  elements.dictionaryProvider.textContent = "内容来源：" + result.provider;
  elements.dictionaryResult.hidden = false;
}

async function handleDictionarySubmit(event) {
  event.preventDefault();
  const validation = DictionaryTools.validateQuery(
    elements.dictionaryQueryInput.value
  );

  if (!validation.valid) {
    elements.dictionaryResult.hidden = true;
    setDictionaryStatus(validation.message, "error");
    elements.dictionaryQueryInput.focus();
    return;
  }

  elements.dictionarySubmitButton.disabled = true;
  elements.dictionarySubmitButton.textContent = "查询中";
  elements.dictionaryResult.hidden = true;
  setDictionaryStatus("正在查询…", "loading");

  try {
    const result = await dictionaryApi.lookup(validation.value);
    renderDictionaryResult(result);
    setDictionaryStatus("", "");
  } catch (error) {
    setDictionaryStatus(error.message, "error");
  } finally {
    elements.dictionarySubmitButton.disabled = false;
    elements.dictionarySubmitButton.textContent = "查询";
  }
}

function bindDictionaryEvents() {
  elements.dictionaryForm.addEventListener("submit", handleDictionarySubmit);
  elements.dictionaryQueryInput.addEventListener(
    "input",
    handleDictionaryQueryInput
  );
}
export {
  bindDictionaryEvents,
  handleDictionaryQueryInput,
  handleDictionarySubmit
};
