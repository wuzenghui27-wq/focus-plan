const assert = require("assert");
const {
  MAX_PLAN_NOTES_LENGTH,
  normalizePlanNotes,
  createPlanNotesPreview
} = require("../text-tools.js");

assert.strictEqual(normalizePlanNotes("  第一行\n第二行  "), "第一行\n第二行");
assert.strictEqual(normalizePlanNotes(null), "");
assert.strictEqual(
  normalizePlanNotes("a".repeat(700)).length,
  MAX_PLAN_NOTES_LENGTH
);
assert.strictEqual(
  normalizePlanNotes("<script>alert('x')</script>"),
  "<script>alert('x')</script>"
);

assert.strictEqual(createPlanNotesPreview("简短备注", 10), "简短备注");
assert.strictEqual(
  createPlanNotesPreview("这是一个比较长的计划备注", 6),
  "这是一个比较..."
);

console.log("Text tools: all tests passed");
