(function (root, factory) {
  const tools = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = tools;
  }

  root.PlanTools = tools;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const POSTPONE_REASON_MAX_LENGTH = 10;

  function getDueTime(plan) {
    if (!plan.dueAt) {
      return Number.POSITIVE_INFINITY;
    }

    const dueTime = new Date(plan.dueAt).getTime();
    return Number.isNaN(dueTime) ? Number.POSITIVE_INFINITY : dueTime;
  }

  function sortPlansForDisplay(plans) {
    return plans.slice().sort(function (firstPlan, secondPlan) {
      if (Boolean(firstPlan.completed) !== Boolean(secondPlan.completed)) {
        return firstPlan.completed ? 1 : -1;
      }

      const dueDifference = getDueTime(firstPlan) - getDueTime(secondPlan);

      return dueDifference ||
        Number(secondPlan.id || 0) - Number(firstPlan.id || 0);
    });
  }

  function normalizePostponeReason(reason) {
    return String(reason || "").trim();
  }

  function validatePostponement(plan, draft, now) {
    const reason = normalizePostponeReason(draft && draft.reason);
    const newDueAt = String(draft && draft.newDueAt || "");
    const newDueTime = new Date(newDueAt).getTime();
    const currentDueTime = new Date(plan && plan.dueAt || "").getTime();
    const currentTime = Number.isFinite(now) ? now : Date.now();
    const minimumDueTime = Number.isNaN(currentDueTime)
      ? currentTime
      : Math.max(currentTime, currentDueTime);

    if (reason === "") {
      return { valid: false, field: "reason", message: "请填写延期原因。" };
    }

    if (Array.from(reason).length > POSTPONE_REASON_MAX_LENGTH) {
      return {
        valid: false,
        field: "reason",
        message: "延期原因不能超过 10 个字。"
      };
    }

    if (newDueAt === "" || Number.isNaN(newDueTime)) {
      return { valid: false, field: "newDueAt", message: "请选择新的计划时间。" };
    }

    if (newDueTime <= minimumDueTime) {
      return {
        valid: false,
        field: "newDueAt",
        message: "新的计划时间必须晚于当前时间和原计划时间。"
      };
    }

    return {
      valid: true,
      value: { reason, newDueAt }
    };
  }

  function markSelectedPlansCompleted(plans, selectedIds) {
    return plans.map(function (plan) {
      if (!selectedIds.has(plan.id)) {
        return plan;
      }

      return Object.assign({}, plan, {
        completed: true
      });
    });
  }

  function removeSelectedPlans(plans, selectedIds) {
    return plans.filter(function (plan) {
      return !selectedIds.has(plan.id);
    });
  }

  return {
    POSTPONE_REASON_MAX_LENGTH: POSTPONE_REASON_MAX_LENGTH,
    sortPlansForDisplay: sortPlansForDisplay,
    normalizePostponeReason: normalizePostponeReason,
    validatePostponement: validatePostponement,
    markSelectedPlansCompleted: markSelectedPlansCompleted,
    removeSelectedPlans: removeSelectedPlans
  };
});
