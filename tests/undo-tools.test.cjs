const assert = require("assert");
const {
  createDeletionSnapshot,
  restoreDeletedPlans
} = require("../undo-tools.js");

const plans = [
  { id: 1, title: "计划一", completed: false },
  { id: 2, title: "计划二", completed: false },
  { id: 3, title: "计划三", completed: true }
];

const snapshot = createDeletionSnapshot(plans, new Set([1, 3]));

assert.deepStrictEqual(
  snapshot.map(function (entry) {
    return entry.index;
  }),
  [0, 2]
);
assert.notStrictEqual(snapshot[0].plan, plans[0]);

const remainingPlans = [plans[1], { id: 4, title: "新计划" }];
const restoredPlans = restoreDeletedPlans(remainingPlans, snapshot);

assert.deepStrictEqual(
  restoredPlans.map(function (plan) {
    return plan.id;
  }),
  [1, 2, 3, 4]
);
assert.strictEqual(remainingPlans.length, 2);

const duplicateSafeResult = restoreDeletedPlans(restoredPlans, snapshot);
assert.deepStrictEqual(
  duplicateSafeResult.map(function (plan) {
    return plan.id;
  }),
  [1, 2, 3, 4]
);

console.log("Undo tools: all tests passed");
