import { initializeSelectMenus } from "./ui/select-menu.js";
import { initializeApp } from "./application.js";

function showStartupError(error) {
  const startupError = document.querySelector("#startupError");
  if (startupError) {
    startupError.textContent = "应用启动失败，请刷新页面或重新启动本地服务。";
    startupError.hidden = false;
  }
  console.error(error);
}

try {
  initializeSelectMenus();
  initializeApp();
} catch (error) {
  showStartupError(error);
}
