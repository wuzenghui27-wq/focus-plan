import assert from "assert";
import {
  POSTPONE_REASON_MAX_LENGTH,
  sortPlansForDisplay,
  validatePostponement,
  markSelectedPlansCompleted,
  removeSelectedPlans
} from "../src/domain/plans.js";

const plans = [
  {
    id: 1,
    title: "学习 JavaScript",
    tag: "课程",
    priority: "high",
    dueAt: "2026-07-28T10:00",
    completed: false
  },
  {
    id: 2,
    title: "整理学习笔记",
    tag: "课程",
    priority: "low",
    dueAt: "",
    completed: true
  },
  {
    id: 3,
    title: "完成 CSS 练习",
    tag: "练习",
    priority: "medium",
    dueAt: "2026-07-27T10:00",
    completed: false
  }
];

assert.deepStrictEqual(
  sortPlansForDisplay(plans).map(function (plan) {
    return plan.id;
  }),
  [3, 1, 2]
);

assert.strictEqual(POSTPONE_REASON_MAX_LENGTH, 10);
assert.deepStrictEqual(validatePostponement(plans[0], {
  newDueAt: "2026-07-29T10:00",
  reason: "  临时有课  "
}, new Date("2026-07-27T08:00").getTime()), {
  valid: true,
  value: {
    newDueAt: "2026-07-29T10:00",
    reason: "临时有课"
  }
});
assert.strictEqual(validatePostponement(plans[0], {
  newDueAt: "2026-07-29T10:00",
  reason: ""
}, new Date("2026-07-27T08:00").getTime()).field, "reason");
assert.strictEqual(validatePostponement(plans[0], {
  newDueAt: "2026-07-29T10:00",
  reason: "超过十个字的延期原因说明"
}, new Date("2026-07-27T08:00").getTime()).field, "reason");
assert.strictEqual(validatePostponement(plans[0], {
  newDueAt: "2026-07-27T09:00",
  reason: "时间冲突"
}, new Date("2026-07-27T08:00").getTime()).field, "newDueAt");

assert.deepStrictEqual(
  plans.map(function (plan) {
    return plan.id;
  }),
  [1, 2, 3]
);

const selectedIds = new Set([1, 3]);
const completedPlans = markSelectedPlansCompleted(plans, selectedIds);

assert.strictEqual(completedPlans[0].completed, true);
assert.strictEqual(completedPlans[1].completed, true);
assert.strictEqual(completedPlans[2].completed, true);
assert.notStrictEqual(completedPlans[0], plans[0]);
assert.strictEqual(completedPlans[1], plans[1]);
assert.strictEqual(plans[0].completed, false);

assert.deepStrictEqual(
  removeSelectedPlans(plans, selectedIds).map(function (plan) {
    return plan.id;
  }),
  [2]
);
assert.strictEqual(plans.length, 3);

console.log("Plan tools: all tests passed");
