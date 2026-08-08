import * as ThemeTools from "../../domain/theme.js";
import { elements, state } from "./context.js";
import { showDataManagementStatus } from "../features/settings.js";

function applyTheme(theme, shouldSave) {
  const normalizedTheme = ThemeTools.normalizeTheme(theme) ||
    ThemeTools.LIGHT_THEME;

  state.theme = normalizedTheme;
  document.documentElement.dataset.theme = normalizedTheme;
  elements.themeToggle.checked =
    normalizedTheme === ThemeTools.DARK_THEME;
  elements.themeLabel.textContent = elements.themeToggle.checked
    ? "浅色模式"
    : "深色模式";

  if (shouldSave) {
    const result = ThemeTools.saveTheme(localStorage, normalizedTheme);

    if (!result.ok) {
      console.error("保存主题设置失败：", result.error);
      showDataManagementStatus("主题已切换，但未能记住本次选择。", "error");
    }
  }
}

function formatDateTime(dateTimeValue) {
  if (!dateTimeValue) {
    return "未设置时间";
  }

  const date = new Date(dateTimeValue);

  if (Number.isNaN(date.getTime())) {
    return "时间格式无效";
  }

  return date.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function isPlanOverdue(plan) {
  if (!plan.dueAt || plan.completed) {
    return false;
  }

  return new Date(plan.dueAt).getTime() <= Date.now();
}
export {
  applyTheme,
  formatDateTime,
  isPlanOverdue
};
