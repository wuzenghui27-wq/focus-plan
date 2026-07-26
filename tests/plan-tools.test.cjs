const assert = require("assert");
const {
  matchesSearch,
  matchesStatus,
  matchesTag,
  filterAndSortPlans,
  markSelectedPlansCompleted,
  removeSelectedPlans
} = require("../plan-tools.js");

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

assert.strictEqual(matchesSearch(plans[0], "javascript"), true);
assert.strictEqual(matchesSearch(plans[0], " JavaScript "), true);
assert.strictEqual(matchesSearch(plans[0], "CSS"), false);
assert.strictEqual(matchesStatus(plans[0], "active"), true);
assert.strictEqual(matchesStatus(plans[1], "completed"), true);
assert.strictEqual(matchesStatus(plans[1], "active"), false);
assert.strictEqual(matchesTag(plans[0], "课程"), true);
assert.strictEqual(matchesTag(plans[0], "练习"), false);
assert.strictEqual(matchesTag(plans[0], ""), true);

assert.deepStrictEqual(
  filterAndSortPlans(plans, {
    searchText: "学习",
    status: "all",
    sortBy: "created-desc"
  }).map(function (plan) {
    return plan.id;
  }),
  [2, 1]
);

assert.deepStrictEqual(
  filterAndSortPlans(plans, {
    searchText: "",
    status: "active",
    sortBy: "due-asc"
  }).map(function (plan) {
    return plan.id;
  }),
  [3, 1]
);

assert.deepStrictEqual(
  filterAndSortPlans(plans, {
    searchText: "",
    status: "all",
    sortBy: "priority-desc"
  }).map(function (plan) {
    return plan.id;
  }),
  [1, 3, 2]
);

assert.deepStrictEqual(
  filterAndSortPlans(plans, {
    searchText: "",
    status: "active",
    tag: "练习",
    sortBy: "created-desc"
  }).map(function (plan) {
    return plan.id;
  }),
  [3]
);

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
