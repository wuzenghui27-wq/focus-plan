const assert = require("assert");
const {
  isTypingTarget,
  getShortcutAction
} = require("../shortcut-tools.js");

assert.strictEqual(isTypingTarget({ tagName: "INPUT" }), true);
assert.strictEqual(isTypingTarget({ tagName: "textarea" }), true);
assert.strictEqual(isTypingTarget({ tagName: "SELECT" }), true);
assert.strictEqual(isTypingTarget({ tagName: "BUTTON" }), false);
assert.strictEqual(
  isTypingTarget({ tagName: "DIV", isContentEditable: true }),
  true
);

function createEvent(key, target, modifiers) {
  return Object.assign({
    key: key,
    target: target || { tagName: "BODY" },
    ctrlKey: false,
    metaKey: false,
    altKey: false
  }, modifiers || {});
}

assert.strictEqual(getShortcutAction(createEvent("n")), "create-plan");
assert.strictEqual(getShortcutAction(createEvent("N")), "create-plan");
assert.strictEqual(getShortcutAction(createEvent("/")), null);
assert.strictEqual(
  getShortcutAction(createEvent("Escape", { tagName: "INPUT" })),
  "escape"
);
assert.strictEqual(
  getShortcutAction(createEvent("n", { tagName: "INPUT" })),
  null
);
assert.strictEqual(
  getShortcutAction(createEvent("n", null, { ctrlKey: true })),
  null
);
assert.strictEqual(getShortcutAction(createEvent("x")), null);

console.log("Shortcut tools: all tests passed");
