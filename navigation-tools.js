(function (root, factory) {
  const tools = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = tools;
  }

  root.NavigationTools = tools;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const DEFAULT_PAGE = "plans";
  const PAGE_NAMES = ["plans", "focus", "history", "dictionary", "settings"];
  const PAGE_TITLES = {
    plans: "我的计划表",
    focus: "专注时长",
    dictionary: "查词",
    history: "专注历史",
    settings: "设置"
  };

  function normalizePage(pageName) {
    return PAGE_NAMES.includes(pageName) ? pageName : DEFAULT_PAGE;
  }

  function getPageFromHash(hash) {
    const hashText = typeof hash === "string" ? hash : "";
    return normalizePage(hashText.replace(/^#\/?/, ""));
  }

  function createPageHash(pageName) {
    return "#" + normalizePage(pageName);
  }

  function getPageTitle(pageName) {
    return PAGE_TITLES[normalizePage(pageName)];
  }

  return {
    DEFAULT_PAGE: DEFAULT_PAGE,
    PAGE_NAMES: PAGE_NAMES,
    PAGE_TITLES: PAGE_TITLES,
    normalizePage: normalizePage,
    getPageFromHash: getPageFromHash,
    createPageHash: createPageHash,
    getPageTitle: getPageTitle
  };
});
