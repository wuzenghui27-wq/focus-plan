(function (root, factory) {
  const tools = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = tools;
  }

  root.PwaTools = tools;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const INSTALL_STATES = {
    INSTALLED: "installed",
    AVAILABLE: "available",
    IOS_MANUAL: "ios-manual",
    UNAVAILABLE: "unavailable"
  };

  function isIosDevice(userAgent, platform, maxTouchPoints) {
    const agent = String(userAgent || "");
    const platformName = String(platform || "");

    return /iPad|iPhone|iPod/i.test(agent) ||
      (
        platformName === "MacIntel" &&
        Number(maxTouchPoints) > 1
      );
  }

  function getInstallState(options) {
    if (Boolean(options.isStandalone)) {
      return INSTALL_STATES.INSTALLED;
    }

    if (Boolean(options.hasInstallPrompt)) {
      return INSTALL_STATES.AVAILABLE;
    }

    if (Boolean(options.isIos)) {
      return INSTALL_STATES.IOS_MANUAL;
    }

    return INSTALL_STATES.UNAVAILABLE;
  }

  function getInstallPresentation(installState) {
    if (installState === INSTALL_STATES.INSTALLED) {
      return {
        buttonText: "",
        buttonVisible: false,
        statusText: "应用已安装"
      };
    }

    if (installState === INSTALL_STATES.AVAILABLE) {
      return {
        buttonText: "安装",
        buttonVisible: true,
        statusText: "可以安装到当前设备"
      };
    }

    if (installState === INSTALL_STATES.IOS_MANUAL) {
      return {
        buttonText: "安装方法",
        buttonVisible: true,
        statusText: "可添加到 iPhone 主屏幕"
      };
    }

    return {
      buttonText: "",
      buttonVisible: false,
      statusText: "当前浏览器暂不提供安装入口"
    };
  }

  return {
    INSTALL_STATES: INSTALL_STATES,
    isIosDevice: isIosDevice,
    getInstallState: getInstallState,
    getInstallPresentation: getInstallPresentation
  };
});
