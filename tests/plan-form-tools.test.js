import assert from "node:assert/strict";
import * as PlanFormTools from "../src/domain/plan-form.js";

const sampleDate = new Date(2026, 6, 31, 14, 10, 25);

assert.equal(
  PlanFormTools.toDateTimeLocalValue(sampleDate),
  "2026-07-31T14:10"
);

assert.equal(
  PlanFormTools.getQuickPlanDate("later", sampleDate),
  "2026-07-31T16:30"
);

assert.equal(
  PlanFormTools.getQuickPlanDate("tomorrow", sampleDate),
  "2026-08-01T09:00"
);

assert.equal(
  PlanFormTools.getQuickPlanDate("weekend", sampleDate),
  "2026-08-01T10:00"
);

assert.equal(PlanFormTools.getQuickPlanDate("clear", sampleDate), "");

assert.deepEqual(PlanFormTools.getCharacterCount("计划", 40), {
  length: 2,
  maximum: 40,
  label: "2 / 40",
  nearLimit: false
});

assert.deepEqual(PlanFormTools.validatePlanDraft({
  title: " ",
  dueAt: "",
  repeat: "none"
}), {
  valid: false,
  field: "title",
  message: "请填写计划名称。"
});

assert.equal(PlanFormTools.validatePlanDraft({
  title: "每日阅读",
  dueAt: "",
  repeat: "daily"
}).field, "dueAt");

assert.equal(PlanFormTools.validatePlanDraft({
  title: "每日阅读",
  dueAt: "2026-08-01T09:00",
  repeat: "daily"
}).valid, true);

console.log("Plan form tools: all tests passed");
