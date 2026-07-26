const assert = require("assert");
const {
  BACKUP_VERSION,
  validateAndNormalizeBackup
} = require("../backup-tools.js");
const {
  normalizeSubtasks
} = require("../subtask-tools.js");

const options = {
  priorityValues: ["low", "medium", "high"],
  achievementIds: [
    "first-focus",
    "total-hour",
    "five-sessions",
    "deep-focus",
    "three-day-streak"
  ]
};

function createValidBackup() {
  return {
    version: BACKUP_VERSION,
    exportedAt: "2026-07-25T00:00:00.000Z",
    plans: [
      {
        id: 1,
        title: "学习 JavaScript",
        tag: "课程",
        notes: "完成课程练习并整理笔记",
        subtasks: [
          { id: 101, text: "完成练习", completed: true }
        ],
        priority: "high",
        dueAt: "2026-07-25T10:00",
        repeat: "daily",
        reminderMinutes: 15,
        reminded: false,
        completed: false,
        nextOccurrenceCreated: true,
        generatedFromId: null
      }
    ],
    focusSessions: [
      {
        id: 10,
        planId: 1,
        planTitle: "学习 JavaScript",
        plannedMinutes: 25,
        actualSeconds: 1500,
        completedAt: "2026-07-25T00:00:00.000Z"
      }
    ],
    achievementUnlocks: [
      {
        id: "first-focus",
        unlockedAt: "2026-07-25T00:00:00.000Z"
      }
    ]
  };
}

const normalized = validateAndNormalizeBackup(createValidBackup(), options);
assert.strictEqual(normalized.plans.length, 1);
assert.strictEqual(normalized.plans[0].tag, "课程");
assert.strictEqual(normalized.plans[0].notes, "完成课程练习并整理笔记");
assert.deepStrictEqual(normalized.plans[0].subtasks, []);
assert.strictEqual(normalized.plans[0].repeat, "none");
assert.strictEqual(normalized.plans[0].reminderMinutes, 0);
assert.strictEqual(normalized.focusSessions[0].actualSeconds, 1500);
assert.strictEqual(normalized.achievementUnlocks.length, 1);

const defaultPriorityBackup = createValidBackup();
defaultPriorityBackup.plans[0].priority = "unknown";
assert.strictEqual(
  validateAndNormalizeBackup(defaultPriorityBackup, options).plans[0].priority,
  "medium"
);

const longTagBackup = createValidBackup();
longTagBackup.plans[0].tag = "  这是一个超过十六个字符的自定义计划标签  ";
assert.strictEqual(
  validateAndNormalizeBackup(longTagBackup, options).plans[0].tag.length,
  16
);

const missingTagBackup = createValidBackup();
delete missingTagBackup.plans[0].tag;
assert.strictEqual(
  validateAndNormalizeBackup(missingTagBackup, options).plans[0].tag,
  ""
);

const longNotesBackup = createValidBackup();
longNotesBackup.plans[0].notes = "a".repeat(700);
assert.strictEqual(
  validateAndNormalizeBackup(longNotesBackup, options).plans[0].notes.length,
  500
);

const missingNotesBackup = createValidBackup();
delete missingNotesBackup.plans[0].notes;
assert.strictEqual(
  validateAndNormalizeBackup(missingNotesBackup, options).plans[0].notes,
  ""
);

const recurrenceOptions = Object.assign({}, options, {
  repeatValues: ["none", "daily", "weekly"],
  reminderMinuteValues: [0, 5, 15, 30, 60],
  normalizeSubtasks: normalizeSubtasks
});
const recurringBackup = createValidBackup();
const normalizedRecurringBackup = validateAndNormalizeBackup(
  recurringBackup,
  recurrenceOptions
);
assert.strictEqual(normalizedRecurringBackup.plans[0].repeat, "daily");
assert.strictEqual(
  normalizedRecurringBackup.plans[0].reminderMinutes,
  15
);
assert.deepStrictEqual(normalizedRecurringBackup.plans[0].subtasks, [
  { id: 101, text: "完成练习", completed: true }
]);
assert.strictEqual(
  normalizedRecurringBackup.plans[0].nextOccurrenceCreated,
  true
);

const unknownRepeatBackup = createValidBackup();
unknownRepeatBackup.plans[0].repeat = "monthly";
assert.strictEqual(
  validateAndNormalizeBackup(unknownRepeatBackup, recurrenceOptions)
    .plans[0].repeat,
  "none"
);

const unknownReminderBackup = createValidBackup();
unknownReminderBackup.plans[0].reminderMinutes = 10;
assert.strictEqual(
  validateAndNormalizeBackup(unknownReminderBackup, recurrenceOptions)
    .plans[0].reminderMinutes,
  0
);

const duplicateAchievementBackup = createValidBackup();
duplicateAchievementBackup.achievementUnlocks.push({
  id: "first-focus",
  unlockedAt: "2026-07-25T01:00:00.000Z"
});
assert.strictEqual(
  validateAndNormalizeBackup(duplicateAchievementBackup, options)
    .achievementUnlocks.length,
  1
);

const wrongVersionBackup = createValidBackup();
wrongVersionBackup.version = 99;
assert.throws(
  function () {
    validateAndNormalizeBackup(wrongVersionBackup, options);
  },
  /不支持这个备份版本/
);

const missingListBackup = createValidBackup();
delete missingListBackup.focusSessions;
assert.throws(
  function () {
    validateAndNormalizeBackup(missingListBackup, options);
  },
  /缺少必要的数据列表/
);

const duplicatePlanBackup = createValidBackup();
duplicatePlanBackup.plans.push({ ...duplicatePlanBackup.plans[0] });
assert.throws(
  function () {
    validateAndNormalizeBackup(duplicatePlanBackup, options);
  },
  /计划数据中存在重复 ID/
);

const invalidSessionBackup = createValidBackup();
invalidSessionBackup.focusSessions[0].completedAt = "not-a-date";
assert.throws(
  function () {
    validateAndNormalizeBackup(invalidSessionBackup, options);
  },
  /专注记录格式无效/
);

console.log("Backup tools: all tests passed");
