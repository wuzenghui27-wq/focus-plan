(function (root, factory) {
  const tools = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = tools;
  }

  root.PlanTools = tools;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const PRIORITY_ORDER = {
    high: 3,
    medium: 2,
    low: 1
  };

  function matchesSearch(plan, searchText) {
    const normalizedSearch = String(searchText || "").trim().toLowerCase();

    if (normalizedSearch === "") {
      return true;
    }

    return String(plan.title || "").toLowerCase().includes(normalizedSearch);
  }

  function matchesStatus(plan, status) {
    if (status === "active") {
      return !plan.completed;
    }

    if (status === "completed") {
      return Boolean(plan.completed);
    }

    return true;
  }

  function matchesTag(plan, tag) {
    const normalizedTag = String(tag || "").trim();

    return normalizedTag === "" ||
      String(plan.tag || "").trim() === normalizedTag;
  }

  function getDueTime(plan) {
    if (!plan.dueAt) {
      return Number.POSITIVE_INFINITY;
    }

    const dueTime = new Date(plan.dueAt).getTime();
    return Number.isNaN(dueTime) ? Number.POSITIVE_INFINITY : dueTime;
  }

  function comparePlans(firstPlan, secondPlan, sortBy) {
    if (sortBy === "due-asc") {
      return getDueTime(firstPlan) - getDueTime(secondPlan);
    }

    if (sortBy === "priority-desc") {
      const priorityDifference =
        (PRIORITY_ORDER[secondPlan.priority] || 0) -
        (PRIORITY_ORDER[firstPlan.priority] || 0);

      return priorityDifference ||
        Number(secondPlan.id || 0) - Number(firstPlan.id || 0);
    }

    return Number(secondPlan.id || 0) - Number(firstPlan.id || 0);
  }

  function filterAndSortPlans(plans, options) {
    const safeOptions = options || {};

    return plans
      .filter(function (plan) {
        return matchesSearch(plan, safeOptions.searchText) &&
          matchesStatus(plan, safeOptions.status) &&
          matchesTag(plan, safeOptions.tag);
      })
      .slice()
      .sort(function (firstPlan, secondPlan) {
        return comparePlans(firstPlan, secondPlan, safeOptions.sortBy);
      });
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
    matchesSearch: matchesSearch,
    matchesStatus: matchesStatus,
    matchesTag: matchesTag,
    filterAndSortPlans: filterAndSortPlans,
    markSelectedPlansCompleted: markSelectedPlansCompleted,
    removeSelectedPlans: removeSelectedPlans
  };
});
