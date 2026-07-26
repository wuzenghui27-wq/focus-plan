(function (root, factory) {
  const tools = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = tools;
  }

  root.SubtaskTools = tools;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const MAX_SUBTASKS = 20;
  const MAX_SUBTASK_TEXT_LENGTH = 60;

  function normalizeSubtasks(value) {
    if (!Array.isArray(value)) {
      return [];
    }

    const usedIds = new Set();

    return value.reduce(function (subtasks, subtask, index) {
      if (
        subtasks.length >= MAX_SUBTASKS ||
        subtask === null ||
        typeof subtask !== "object"
      ) {
        return subtasks;
      }

      const text = typeof subtask.text === "string"
        ? subtask.text.trim().slice(0, MAX_SUBTASK_TEXT_LENGTH)
        : "";

      if (text === "") {
        return subtasks;
      }

      let id = (
        (typeof subtask.id === "number" && Number.isFinite(subtask.id)) ||
        (typeof subtask.id === "string" && subtask.id.trim() !== "")
      )
        ? subtask.id
        : "legacy-subtask-" + index;

      while (usedIds.has(typeof id + ":" + String(id))) {
        id = String(id) + "-" + index;
      }

      usedIds.add(typeof id + ":" + String(id));
      subtasks.push({
        id: id,
        text: text,
        completed: Boolean(subtask.completed)
      });
      return subtasks;
    }, []);
  }

  function createSubtask(id, text) {
    const normalized = normalizeSubtasks([
      { id: id, text: text, completed: false }
    ]);

    return normalized[0] || null;
  }

  function toggleSubtask(subtasks, id, completed) {
    return subtasks.map(function (subtask) {
      return subtask.id === id
        ? Object.assign({}, subtask, { completed: Boolean(completed) })
        : subtask;
    });
  }

  function removeSubtask(subtasks, id) {
    return subtasks.filter(function (subtask) {
      return subtask.id !== id;
    });
  }

  function calculateSubtaskProgress(subtasks) {
    const completed = subtasks.filter(function (subtask) {
      return subtask.completed;
    }).length;

    return {
      completed: completed,
      total: subtasks.length
    };
  }

  return {
    MAX_SUBTASKS: MAX_SUBTASKS,
    MAX_SUBTASK_TEXT_LENGTH: MAX_SUBTASK_TEXT_LENGTH,
    normalizeSubtasks: normalizeSubtasks,
    createSubtask: createSubtask,
    toggleSubtask: toggleSubtask,
    removeSubtask: removeSubtask,
    calculateSubtaskProgress: calculateSubtaskProgress
  };
});
