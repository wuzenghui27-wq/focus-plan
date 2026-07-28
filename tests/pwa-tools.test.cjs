const assert = require("assert");
const {
  INSTALL_STATES,
  isIosDevice,
  getInstallState,
  getInstallPresentation
} = require("../pwa-tools.js");

assert.strictEqual(
  isIosDevice("Mozilla/5.0 (iPhone)", "iPhone", 5),
  true
);
assert.strictEqual(
  isIosDevice("Mozilla/5.0", "MacIntel", 5),
  true
);
assert.strictEqual(
  isIosDevice("Mozilla/5.0 (Windows NT 10.0)", "Win32", 0),
  false
);

assert.strictEqual(
  getInstallState({
    isStandalone: true,
    hasInstallPrompt: true,
    isIos: false
  }),
  INSTALL_STATES.INSTALLED
);
assert.strictEqual(
  getInstallState({
    isStandalone: false,
    hasInstallPrompt: true,
    isIos: false
  }),
  INSTALL_STATES.AVAILABLE
);
assert.strictEqual(
  getInstallState({
    isStandalone: false,
    hasInstallPrompt: false,
    isIos: true
  }),
  INSTALL_STATES.IOS_MANUAL
);
assert.strictEqual(
  getInstallState({
    isStandalone: false,
    hasInstallPrompt: false,
    isIos: false
  }),
  INSTALL_STATES.UNAVAILABLE
);

assert.deepStrictEqual(
  getInstallPresentation(INSTALL_STATES.AVAILABLE),
  {
    buttonText: "安装",
    buttonVisible: true,
    statusText: "可以安装到当前设备"
  }
);
assert.strictEqual(
  getInstallPresentation(INSTALL_STATES.INSTALLED).buttonVisible,
  false
);
assert.strictEqual(
  getInstallPresentation(INSTALL_STATES.IOS_MANUAL).buttonText,
  "安装方法"
);

console.log("PWA tools: all tests passed");
