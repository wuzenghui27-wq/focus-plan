(function (root, factory) {
  const tools = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = tools;
  }

  root.UndoTools = tools;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function createDeletionSnapshot(plans, selectedIds) {
    return plans.reduce(function (snapshot, plan, index) {
      if (selectedIds.has(plan.id)) {
        snapshot.push({
          index: index,
          plan: Object.assign({}, plan)
        });
      }

      return snapshot;
    }, []);
  }

  function restoreDeletedPlans(plans, snapshot) {
    const restoredPlans = plans.slice();
    const orderedSnapshot = snapshot.slice().sort(function (first, second) {
      return first.index - second.index;
    });

    orderedSnapshot.forEach(function (entry) {
      const alreadyExists = restoredPlans.some(function (plan) {
        return plan.id === entry.plan.id;
      });

      if (!alreadyExists) {
        const insertionIndex = Math.min(entry.index, restoredPlans.length);
        restoredPlans.splice(
          insertionIndex,
          0,
          Object.assign({}, entry.plan)
        );
      }
    });

    return restoredPlans;
  }

  return {
    createDeletionSnapshot: createDeletionSnapshot,
    restoreDeletedPlans: restoreDeletedPlans
  };
});
