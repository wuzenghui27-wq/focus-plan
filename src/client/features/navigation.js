import * as NavigationTools from "../../domain/navigation.js";
import { elements, state } from "../core/context.js";
import { closePlanForm } from "./plans.js";

function renderAppPage(pageName, shouldScroll) {
  const activePage = NavigationTools.normalizePage(pageName);

  if (activePage !== "plans" && !elements.planForm.hidden) {
    closePlanForm();
  }

  state.activePage = activePage;
  elements.appPages.forEach(function (page) {
    const isActive = page.dataset.page === activePage;

    page.hidden = !isActive;
    page.classList.toggle("is-active", isActive);
  });
  elements.appTabs.forEach(function (tab) {
    const isActive = tab.dataset.pageTarget === activePage;

    tab.classList.toggle("is-active", isActive);
    tab.setAttribute("aria-selected", String(isActive));
    tab.tabIndex = isActive ? 0 : -1;
  });
  document.title =
    NavigationTools.getPageTitle(activePage) + " · FanP";

  if (shouldScroll) {
    window.scrollTo({ top: 0, behavior: "auto" });
  }
}

function navigateToPage(pageName) {
  const normalizedPage = NavigationTools.normalizePage(pageName);
  const nextHash = NavigationTools.createPageHash(normalizedPage);

  renderAppPage(normalizedPage, true);

  if (window.location.hash === nextHash) {
    return;
  }

  window.location.hash = nextHash;
}

function handlePageHashChange() {
  renderAppPage(
    NavigationTools.getPageFromHash(window.location.hash),
    true
  );
}

function handleAppTabKeydown(event) {
  const supportedKeys = ["ArrowLeft", "ArrowRight", "Home", "End"];
  if (!supportedKeys.includes(event.key)) {
    return;
  }

  const tabs = Array.from(elements.appTabs);
  const currentIndex = tabs.indexOf(event.currentTarget);
  let nextIndex = currentIndex;

  if (event.key === "ArrowLeft") {
    nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
  } else if (event.key === "ArrowRight") {
    nextIndex = (currentIndex + 1) % tabs.length;
  } else if (event.key === "Home") {
    nextIndex = 0;
  } else if (event.key === "End") {
    nextIndex = tabs.length - 1;
  }

  event.preventDefault();
  tabs[nextIndex].focus();
  navigateToPage(tabs[nextIndex].dataset.pageTarget);
}

function bindNavigationEvents() {
  window.addEventListener("hashchange", handlePageHashChange);
  elements.appTabs.forEach(function (tab) {
    tab.addEventListener("click", function () {
      navigateToPage(tab.dataset.pageTarget);
    });
    tab.addEventListener("keydown", handleAppTabKeydown);
  });
}
export {
  bindNavigationEvents,
  handlePageHashChange,
  navigateToPage,
  renderAppPage
};
