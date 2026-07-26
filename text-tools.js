(function (root, factory) {
  const tools = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = tools;
  }

  root.TextTools = tools;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const MAX_PLAN_NOTES_LENGTH = 500;

  function normalizePlanNotes(value) {
    return typeof value === "string"
      ? value.trim().slice(0, MAX_PLAN_NOTES_LENGTH)
      : "";
  }

  function createPlanNotesPreview(value, maximumLength) {
    const notes = normalizePlanNotes(value);
    const limit = Number.isInteger(maximumLength) && maximumLength > 0
      ? maximumLength
      : 90;

    if (notes.length <= limit) {
      return notes;
    }

    return notes.slice(0, limit).trimEnd() + "...";
  }

  return {
    MAX_PLAN_NOTES_LENGTH: MAX_PLAN_NOTES_LENGTH,
    normalizePlanNotes: normalizePlanNotes,
    createPlanNotesPreview: createPlanNotesPreview
  };
});
