(function (globalScope) {
  const TITLE_MAX_LENGTH = 40;
  const NOTES_MAX_LENGTH = 500;

  function padNumber(value) {
    return String(value).padStart(2, "0");
  }

  function toDateTimeLocalValue(value) {
    const date = value instanceof Date ? value : new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    return [
      date.getFullYear(),
      "-",
      padNumber(date.getMonth() + 1),
      "-",
      padNumber(date.getDate()),
      "T",
      padNumber(date.getHours()),
      ":",
      padNumber(date.getMinutes())
    ].join("");
  }

  function roundUpToHalfHour(date) {
    const rounded = new Date(date.getTime());
    rounded.setSeconds(0, 0);

    const minutes = rounded.getMinutes();
    const roundedMinutes = Math.ceil(minutes / 30) * 30;
    rounded.setMinutes(roundedMinutes);

    return rounded;
  }

  function getQuickPlanDate(preset, currentDate) {
    const now = currentDate instanceof Date
      ? new Date(currentDate.getTime())
      : new Date();

    if (preset === "clear") {
      return "";
    }

    if (preset === "later") {
      now.setHours(now.getHours() + 2);
      return toDateTimeLocalValue(roundUpToHalfHour(now));
    }

    if (preset === "tomorrow") {
      now.setDate(now.getDate() + 1);
      now.setHours(9, 0, 0, 0);
      return toDateTimeLocalValue(now);
    }

    if (preset === "weekend") {
      const daysUntilSaturday = (6 - now.getDay() + 7) % 7;
      const weekend = new Date(now.getTime());
      weekend.setDate(weekend.getDate() + daysUntilSaturday);
      weekend.setHours(10, 0, 0, 0);

      if (weekend.getTime() <= now.getTime()) {
        weekend.setDate(weekend.getDate() + 7);
      }

      return toDateTimeLocalValue(weekend);
    }

    return "";
  }

  function getCharacterCount(value, maxLength) {
    const length = String(value || "").length;
    const maximum = Number(maxLength);

    return {
      length,
      maximum,
      label: `${length} / ${maximum}`,
      nearLimit: maximum > 0 && length >= maximum * 0.9
    };
  }

  function validatePlanDraft(draft) {
    const title = String(draft && draft.title || "").trim();
    const dueAt = String(draft && draft.dueAt || "");
    const repeat = String(draft && draft.repeat || "none");

    if (title === "") {
      return {
        valid: false,
        field: "title",
        message: "请填写计划名称。"
      };
    }

    if (title.length > TITLE_MAX_LENGTH) {
      return {
        valid: false,
        field: "title",
        message: `计划名称不能超过 ${TITLE_MAX_LENGTH} 个字。`
      };
    }

    if (dueAt !== "" && Number.isNaN(new Date(dueAt).getTime())) {
      return {
        valid: false,
        field: "dueAt",
        message: "请选择有效的计划时间。"
      };
    }

    if (repeat !== "none" && dueAt === "") {
      return {
        valid: false,
        field: "dueAt",
        message: "重复计划必须设置计划时间。"
      };
    }

    return {
      valid: true,
      field: "",
      message: ""
    };
  }

  const planFormTools = {
    TITLE_MAX_LENGTH,
    NOTES_MAX_LENGTH,
    getCharacterCount,
    getQuickPlanDate,
    toDateTimeLocalValue,
    validatePlanDraft
  };

  globalScope.PlanFormTools = planFormTools;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = planFormTools;
  }
})(typeof window !== "undefined" ? window : globalThis);
