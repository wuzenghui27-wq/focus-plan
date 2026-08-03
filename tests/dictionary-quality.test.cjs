const assert = require("assert");
const {
  createEcdictProvider,
  getChineseTranslation,
  getPrimaryPartOfSpeech
} = require("../server/ecdict-provider.cjs");
const {
  CORE_TRANSLATIONS,
  getCoreTranslation
} = require("../server/core-translations.cjs");

const expectedTranslations = {
  apple: ["苹果"],
  answer: ["答案", "回答"],
  bad: ["坏", "不好", "糟糕"],
  bank: ["银行"],
  beautiful: ["美丽", "漂亮"],
  better: ["更好"],
  big: ["大", "巨大"],
  book: ["书", "书本"],
  bright: ["明亮", "光亮", "亮"],
  build: ["建造", "建设", "建筑", "建立"],
  buy: ["买", "购买"],
  car: ["汽车", "车"],
  child: ["孩子", "儿童"],
  children: ["孩子们"],
  choose: ["选择", "挑选"],
  city: ["城市"],
  clean: ["干净", "清洁"],
  close: ["关闭", "关", "合上"],
  cold: ["冷", "寒冷"],
  computer: ["电脑", "计算机"],
  country: ["国家"],
  create: ["创造", "创建"],
  created: ["被创造的"],
  day: ["天", "日", "白天"],
  difficult: ["困难", "难"],
  dirty: ["脏", "肮脏"],
  drink: ["喝", "饮用", "饮料"],
  easy: ["容易", "简单"],
  eat: ["吃"],
  environment: ["环境"],
  family: ["家庭", "家人"],
  fast: ["快", "快速"],
  father: ["父亲", "爸爸"],
  find: ["找到", "发现", "找"],
  focus: ["焦点", "专注", "重点", "对焦"],
  food: ["食物", "食品"],
  forget: ["忘记", "遗忘"],
  friend: ["朋友"],
  give: ["给", "给予"],
  good: ["好", "良好"],
  happy: ["快乐", "高兴", "幸福"],
  heal: ["疗愈", "治愈", "医治", "愈合"],
  health: ["健康"],
  help: ["帮助", "帮", "帮忙"],
  hot: ["热", "炎热"],
  house: ["房子", "住宅", "房屋"],
  important: ["重要"],
  know: ["知道", "了解", "认识"],
  learn: ["学习", "学会"],
  light: ["光", "光线", "光明", "灯光"],
  listen: ["听", "倾听"],
  lose: ["失去", "丢失", "输", "遗失"],
  love: ["爱", "爱情", "喜爱"],
  make: ["制作", "制造", "使"],
  money: ["钱", "金钱"],
  mice: ["老鼠"],
  mother: ["母亲", "妈妈"],
  new: ["新", "新的"],
  old: ["老", "旧", "古老"],
  open: ["打开", "开放", "开"],
  phone: ["电话", "手机"],
  problem: ["问题", "难题"],
  question: ["问题", "疑问"],
  quickly: ["快速", "迅速", "赶快", "很快"],
  read: ["读", "阅读"],
  remember: ["记得", "记住", "记忆"],
  resilience: ["恢复力"],
  run: ["跑", "跑步", "运行"],
  running: ["跑步"],
  sad: ["悲伤", "难过", "伤心"],
  school: ["学校"],
  see: ["看见", "看到", "看"],
  sell: ["卖", "出售"],
  serendipity: ["意外发现的幸运"],
  sleep: ["睡", "睡觉", "睡眠"],
  slow: ["慢", "缓慢"],
  small: ["小", "小型"],
  speak: ["说", "说话", "讲话"],
  start: ["开始", "启动"],
  stop: ["停止", "停"],
  student: ["学生"],
  study: ["学习", "研究"],
  studies: ["学习"],
  take: ["拿", "取", "带", "采取"],
  teach: ["教", "教授"],
  teacher: ["老师", "教师"],
  think: ["想", "思考", "认为"],
  time: ["时间"],
  understand: ["理解", "明白", "懂"],
  walk: ["走", "步行", "散步"],
  watch: ["观看", "看", "手表"],
  water: ["水"],
  weak: ["弱", "虚弱"],
  work: ["工作"],
  world: ["世界"],
  write: ["写", "写作", "书写"],
  written: ["书面的"],
  went: ["去"],
  year: ["年"],
  young: ["年轻", "幼小"]
};

const ecdict = createEcdictProvider();
const failures = [];

assert.ok(Object.keys(CORE_TRANSLATIONS).length >= 30);
assert.strictEqual(getCoreTranslation("unknown-word"), null);

for (const [word, accepted] of Object.entries(expectedTranslations)) {
  const entry = ecdict.lookup(word);
  const core = getCoreTranslation(word, entry?.lemma);
  const actual = core?.chinese || getChineseTranslation(
    entry,
    core?.partOfSpeech || getPrimaryPartOfSpeech(entry)
  );
  const normalizedActual = actual.replace(/[的地]$/, "");
  if (!accepted.includes(actual) && !accepted.includes(normalizedActual)) {
    failures.push({ word, expected: accepted.join("/"), actual: actual || "缺失" });
  }
}

assert.deepStrictEqual(failures, []);
console.log(
  `Dictionary quality: ${Object.keys(expectedTranslations).length} words passed`
);
