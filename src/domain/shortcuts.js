function isTypingTarget(target) {
  if (!target) {
    return false;
  }

  const tagName = String(target.tagName || "").toLowerCase();

  return tagName === "input" ||
    tagName === "textarea" ||
    tagName === "select" ||
    Boolean(target.isContentEditable);
}

function getShortcutAction(event) {
  if (event.key === "Escape") {
    return "escape";
  }

  if (
    event.ctrlKey ||
    event.metaKey ||
    event.altKey ||
    isTypingTarget(event.target)
  ) {
    return null;
  }

  const key = String(event.key || "").toLowerCase();

  if (key === "n") {
    return "create-plan";
  }

  return null;
}


export {
  isTypingTarget,
  getShortcutAction
};
