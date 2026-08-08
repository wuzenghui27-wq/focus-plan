const CORE_TRANSLATIONS = {
  answer: { partOfSpeech: "noun", chinese: "答案" },
  bank: {
    partOfSpeech: "noun",
    chinese: "银行",
    keywords: ["institution", "money", "borrow", "financial"]
  },
  beautiful: { partOfSpeech: "adjective", chinese: "美丽" },
  bright: { partOfSpeech: "adjective", chinese: "明亮" },
  clean: { partOfSpeech: "adjective", chinese: "干净" },
  close: { partOfSpeech: "verb", chinese: "关闭" },
  cold: { partOfSpeech: "adjective", chinese: "寒冷" },
  difficult: { partOfSpeech: "adjective", chinese: "困难" },
  dirty: { partOfSpeech: "adjective", chinese: "脏" },
  fast: {
    partOfSpeech: "adjective",
    chinese: "快速",
    keywords: ["speed", "swift", "rapid", "moving"]
  },
  focus: {
    partOfSpeech: "noun",
    chinese: "焦点",
    keywords: ["point", "rays", "converge"]
  },
  give: { partOfSpeech: "verb", chinese: "给" },
  good: { partOfSpeech: "adjective", chinese: "好" },
  heal: { partOfSpeech: "verb", chinese: "治愈" },
  hot: { partOfSpeech: "adjective", chinese: "热" },
  light: {
    partOfSpeech: "noun",
    chinese: "光",
    keywords: ["radiation", "visible", "illumination"]
  },
  match: {
    partOfSpeech: "noun",
    chinese: "比赛",
    keywords: ["competitive", "sport", "event", "game"]
  },
  old: { partOfSpeech: "adjective", chinese: "老" },
  open: { partOfSpeech: "verb", chinese: "打开" },
  phone: { partOfSpeech: "noun", chinese: "电话" },
  read: { partOfSpeech: "verb", chinese: "阅读" },
  run: { partOfSpeech: "verb", chinese: "跑" },
  sad: { partOfSpeech: "adjective", chinese: "悲伤" },
  see: { partOfSpeech: "verb", chinese: "看见" },
  slow: { partOfSpeech: "adjective", chinese: "慢" },
  small: { partOfSpeech: "adjective", chinese: "小" },
  spring: {
    partOfSpeech: "noun",
    chinese: "春天",
    keywords: ["season", "growth", "springtime"]
  },
  start: { partOfSpeech: "verb", chinese: "开始" },
  steal: { partOfSpeech: "verb", chinese: "偷窃" },
  study: { partOfSpeech: "verb", chinese: "学习" },
  take: { partOfSpeech: "verb", chinese: "拿" },
  teach: { partOfSpeech: "verb", chinese: "教" },
  think: { partOfSpeech: "verb", chinese: "思考" },
  watch: { partOfSpeech: "verb", chinese: "观看" },
  weak: { partOfSpeech: "adjective", chinese: "弱" },
  young: { partOfSpeech: "adjective", chinese: "年轻" },
  better: {
    partOfSpeech: "adjective",
    chinese: "更好",
    keywords: ["good", "improved", "superior"]
  },
  children: { partOfSpeech: "noun", chinese: "孩子们" },
  created: { partOfSpeech: "adjective", chinese: "被创造的" },
  resilience: {
    partOfSpeech: "noun",
    chinese: "恢复力",
    keywords: ["recover", "ability", "misfortune", "adversity"]
  },
  running: { partOfSpeech: "verb", chinese: "跑步" },
  serendipity: { partOfSpeech: "noun", chinese: "意外发现的幸运" },
  written: { partOfSpeech: "adjective", chinese: "书面的" }
};

function getCoreTranslation(word, lemma) {
  return CORE_TRANSLATIONS[String(word || "").toLowerCase()] ||
    CORE_TRANSLATIONS[String(lemma || "").toLowerCase()] || null;
}

export { CORE_TRANSLATIONS, getCoreTranslation };
