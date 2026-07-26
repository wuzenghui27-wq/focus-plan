(function (globalScope) {
  const BACKUP_VERSION = 1;

  function isValidDataId(id) {
    return (typeof id === "number" && Number.isFinite(id)) ||
      (typeof id === "string" && id.trim() !== "");
  }

  function validateDateString(value) {
    return typeof value === "string" && !Number.isNaN(new Date(value).getTime());
  }

  function assertUniqueIds(records, label) {
    const ids = new Set();

    records.forEach(function (record) {
      const idKey = typeof record.id + ":" + String(record.id);

      if (ids.has(idKey)) {
        throw new Error(label + "中存在重复 ID");
      }

      ids.add(idKey);
    });
  }

  function validateAndNormalizeBackup(backup, options) {
    const priorityValues = new Set(options.priorityValues);
    const repeatValues = new Set(options.repeatValues || ["none"]);
    const reminderMinuteValues = new Set(
      options.reminderMinuteValues || [0]
    );
    const normalizeSubtasks = typeof options.normalizeSubtasks === "function"
      ? options.normalizeSubtasks
      : function () { return []; };
    const validAchievementIds = new Set(options.achievementIds);

    if (backup === null || typeof backup !== "object" || Array.isArray(backup)) {
      throw new Error("备份文件不是有效对象");
    }

    if (backup.version !== BACKUP_VERSION) {
      throw new Error("不支持这个备份版本");
    }

    if (
      !Array.isArray(backup.plans) ||
      !Array.isArray(backup.focusSessions) ||
      !Array.isArray(backup.achievementUnlocks)
    ) {
      throw new Error("备份文件缺少必要的数据列表");
    }

    const plans = backup.plans.map(function (plan, index) {
      if (
        plan === null ||
        typeof plan !== "object" ||
        !isValidDataId(plan.id) ||
        typeof plan.title !== "string" ||
        plan.title.trim() === ""
      ) {
        throw new Error("第 " + (index + 1) + " 条计划格式无效");
      }

      const dueAt = typeof plan.dueAt === "string" ? plan.dueAt : "";

      if (dueAt && !validateDateString(dueAt)) {
        throw new Error("第 " + (index + 1) + " 条计划时间无效");
      }

      return {
        id: plan.id,
        title: plan.title.trim().slice(0, 40),
        tag: typeof plan.tag === "string"
          ? plan.tag.trim().slice(0, 16)
          : "",
        notes: typeof plan.notes === "string"
          ? plan.notes.trim().slice(0, 500)
          : "",
        subtasks: normalizeSubtasks(plan.subtasks),
        priority: priorityValues.has(plan.priority) ? plan.priority : "medium",
        dueAt,
        repeat: repeatValues.has(plan.repeat) ? plan.repeat : "none",
        reminderMinutes: reminderMinuteValues.has(
          Number(plan.reminderMinutes)
        )
          ? Number(plan.reminderMinutes)
          : 0,
        reminded: Boolean(plan.reminded),
        completed: Boolean(plan.completed),
        nextOccurrenceCreated: Boolean(plan.nextOccurrenceCreated),
        generatedFromId: isValidDataId(plan.generatedFromId)
          ? plan.generatedFromId
          : null
      };
    });

    assertUniqueIds(plans, "计划数据");

    const focusSessions = backup.focusSessions.map(function (session, index) {
      const plannedMinutes = Number(session?.plannedMinutes);
      const actualSeconds = Number(session?.actualSeconds);

      if (
        session === null ||
        typeof session !== "object" ||
        !isValidDataId(session.id) ||
        !Number.isFinite(plannedMinutes) ||
        plannedMinutes <= 0 ||
        !Number.isFinite(actualSeconds) ||
        actualSeconds <= 0 ||
        !(
          session.planId === null ||
          session.planId === undefined ||
          isValidDataId(session.planId)
        ) ||
        typeof session.planTitle !== "string" ||
        !validateDateString(session.completedAt)
      ) {
        throw new Error("第 " + (index + 1) + " 条专注记录格式无效");
      }

      return {
        id: session.id,
        planId: session.planId ?? null,
        planTitle: (session.planTitle.trim() || "自由专注").slice(0, 80),
        plannedMinutes,
        actualSeconds,
        completedAt: session.completedAt
      };
    });

    assertUniqueIds(focusSessions, "专注记录");

    const importedAchievementIds = new Set();
    const achievementUnlocks = [];

    backup.achievementUnlocks.forEach(function (unlock, index) {
      if (
        unlock === null ||
        typeof unlock !== "object" ||
        !validAchievementIds.has(unlock.id) ||
        !validateDateString(unlock.unlockedAt)
      ) {
        throw new Error("第 " + (index + 1) + " 条成就记录格式无效");
      }

      if (!importedAchievementIds.has(unlock.id)) {
        importedAchievementIds.add(unlock.id);
        achievementUnlocks.push({
          id: unlock.id,
          unlockedAt: unlock.unlockedAt
        });
      }
    });

    return { plans, focusSessions, achievementUnlocks };
  }

  const backupTools = {
    BACKUP_VERSION,
    validateAndNormalizeBackup
  };

  if (typeof module === "object" && module.exports) {
    module.exports = backupTools;
  }

  globalScope.BackupTools = backupTools;
})(globalThis);
