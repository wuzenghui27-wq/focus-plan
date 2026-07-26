const assert = require("assert");
const {
  MAX_SUBTASKS,
  MAX_SUBTASK_TEXT_LENGTH,
  normalizeSubtasks,
  createSubtask,
  toggleSubtask,
  removeSubtask,
  calculateSubtaskProgress
} = require("../subtask-tools.js");

const normalized = normalizeSubtasks([
  { id: 1, text: "  阅读文档  ", completed: false },
  { id: 1, text: "完成练习", completed: true },
  { id: 3, text: "", completed: false },
  null,
  { text: "a".repeat(100), completed: false }
]);

assert.strictEqual(normalized.length, 3);
assert.strictEqual(normalized[0].text, "阅读文档");
assert.notStrictEqual(normalized[0].id, normalized[1].id);
assert.strictEqual(normalized[2].text.length, MAX_SUBTASK_TEXT_LENGTH);
assert.strictEqual(normalizeSubtasks(null).length, 0);
assert.strictEqual(
  normalizeSubtasks(
    Array.from({ length: 30 }, function (_, index) {
      return { id: index, text: "任务 " + index };
    })
  ).length,
  MAX_SUBTASKS
);

assert.deepStrictEqual(createSubtask(10, "  新任务 "), {
  id: 10,
  text: "新任务",
  completed: false
});
assert.strictEqual(createSubtask(10, "   "), null);

const toggled = toggleSubtask(normalized, normalized[0].id, true);
assert.strictEqual(toggled[0].completed, true);
assert.strictEqual(normalized[0].completed, false);

const removed = removeSubtask(toggled, toggled[1].id);
assert.strictEqual(removed.length, 2);
assert.deepStrictEqual(calculateSubtaskProgress(toggled), {
  completed: 2,
  total: 3
});

console.log("Subtask tools: all tests passed");
