(function (root, factory) {
  const tools = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = tools;
  }

  root.ReminderPresenter = tools;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const MOBILE_BREAKPOINT = 700;
  const SWIPE_DISMISS_DISTANCE = 45;

  function getReminderPlacement(viewportWidth) {
    return Number(viewportWidth) <= MOBILE_BREAKPOINT
      ? "mobile-top"
      : "desktop-bottom-left";
  }

  function shouldUseSystemNotification(visibilityState) {
    return visibilityState !== "visible";
  }

  function shouldDismissFromSwipe(startY, endY) {
    return Number(endY) - Number(startY) <= -SWIPE_DISMISS_DISTANCE;
  }

  function createPresenter(container, options) {
    const timers = new Map();
    const displayDuration = options?.displayDuration || 8000;
    const maximumVisible = options?.maximumVisible || 3;
    const onActivate = options?.onActivate;
    const onSnooze = options?.onSnooze;

    function dismiss(item) {
      if (!item || item.dataset.dismissing === "true") {
        return;
      }
      item.dataset.dismissing = "true";
      window.clearTimeout(timers.get(item));
      timers.delete(item);
      item.addEventListener("animationend", function () {
        item.remove();
      }, { once: true });
      item.classList.add("is-dismissing");
    }

    function attachSwipe(item) {
      let startY = null;
      let suppressActivation = false;

      item.addEventListener("pointerdown", function (event) {
        if (event.target.closest("button, select")) {
          return;
        }

        if (getReminderPlacement(window.innerWidth) !== "mobile-top") {
          return;
        }
        startY = event.clientY;
        item.setPointerCapture(event.pointerId);
      });

      item.addEventListener("pointermove", function (event) {
        if (startY === null) {
          return;
        }
        const distance = Math.min(0, event.clientY - startY);
        item.style.transform = "translateY(" + distance + "px)";
        item.style.opacity = String(Math.max(0.35, 1 + distance / 120));
      });

      item.addEventListener("pointerup", function (event) {
        if (startY === null) {
          return;
        }
        const dismissFromSwipe = shouldDismissFromSwipe(
          startY,
          event.clientY
        );
        suppressActivation = Math.abs(event.clientY - startY) > 8;
        startY = null;
        item.style.transform = "";
        item.style.opacity = "";

        if (dismissFromSwipe) {
          dismiss(item);
        }
      });

      item.addEventListener("click", function (event) {
        if (
          suppressActivation ||
          event.target.closest("button, select")
        ) {
          suppressActivation = false;
          return;
        }

        if (typeof onActivate === "function") {
          onActivate(item.reminderData);
        }
        dismiss(item);
      });
    }

    function show(reminder) {
      const existing = Array.from(container.children).find(function (item) {
        return item.dataset.reminderTag === reminder.tag;
      });
      if (existing) {
        dismiss(existing);
      }

      while (container.children.length >= maximumVisible) {
        dismiss(container.firstElementChild);
        if (container.children.length >= maximumVisible) {
          container.firstElementChild.remove();
        }
      }

      const item = document.createElement("article");
      const appIcon = document.createElement("span");
      const content = document.createElement("div");
      const meta = document.createElement("div");
      const appName = document.createElement("span");
      const time = document.createElement("time");
      const title = document.createElement("strong");
      const body = document.createElement("p");
      const closeButton = document.createElement("button");
      let snoozeSelect = null;

      item.className = "app-reminder";
      item.dataset.reminderTag = reminder.tag;
      item.reminderData = reminder;
      item.setAttribute("role", "alert");
      item.setAttribute(
        "aria-label",
        reminder.title + "：" + reminder.body + "。点击查看"
      );
      item.tabIndex = 0;
      appIcon.className = "app-reminder-icon";
      appIcon.textContent = "FP";
      content.className = "app-reminder-content";
      meta.className = "app-reminder-meta";
      appName.textContent = "Focus Plan";
      time.dateTime = new Date().toISOString();
      time.textContent = "现在";
      title.textContent = reminder.title;
      body.textContent = reminder.body;

      if (
        typeof onSnooze === "function" &&
        Array.isArray(reminder.snoozeOptions) &&
        reminder.snoozeOptions.length > 0
      ) {
        snoozeSelect = document.createElement("select");
        const placeholderOption = document.createElement("option");

        snoozeSelect.className = "app-reminder-snooze";
        snoozeSelect.setAttribute("aria-label", "选择稍后提醒时间");
        placeholderOption.value = "";
        placeholderOption.textContent = "稍后提醒";
        placeholderOption.disabled = true;
        placeholderOption.selected = true;
        snoozeSelect.appendChild(placeholderOption);

        reminder.snoozeOptions.forEach(function (minutes) {
          const option = document.createElement("option");
          option.value = String(minutes);
          option.textContent = Number(minutes) === 60
            ? "1 小时后"
            : minutes + " 分钟后";
          snoozeSelect.appendChild(option);
        });

        snoozeSelect.addEventListener("click", function (event) {
          event.stopPropagation();
        });
        snoozeSelect.addEventListener("change", function () {
          onSnooze(item.reminderData, Number(snoozeSelect.value));
          dismiss(item);
        });
      }

      closeButton.type = "button";
      closeButton.className = "app-reminder-close";
      closeButton.setAttribute("aria-label", "关闭提醒");
      closeButton.textContent = "×";
      closeButton.addEventListener("click", function () {
        dismiss(item);
      });
      item.addEventListener("keydown", function (event) {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          if (typeof onActivate === "function") {
            onActivate(item.reminderData);
          }
          dismiss(item);
        }
      });

      meta.appendChild(appName);
      meta.appendChild(time);
      content.appendChild(meta);
      content.appendChild(title);
      content.appendChild(body);
      if (snoozeSelect !== null) {
        content.appendChild(snoozeSelect);
      }
      item.appendChild(appIcon);
      item.appendChild(content);
      item.appendChild(closeButton);
      attachSwipe(item);
      container.appendChild(item);
      timers.set(item, window.setTimeout(function () {
        dismiss(item);
      }, displayDuration));
      return item;
    }

    return { show, dismiss };
  }

  return {
    MOBILE_BREAKPOINT,
    SWIPE_DISMISS_DISTANCE,
    getReminderPlacement,
    shouldUseSystemNotification,
    shouldDismissFromSwipe,
    createPresenter
  };
});
