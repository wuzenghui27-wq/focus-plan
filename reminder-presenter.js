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

      item.addEventListener("pointerdown", function (event) {
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
        startY = null;
        item.style.transform = "";
        item.style.opacity = "";

        if (dismissFromSwipe) {
          dismiss(item);
        }
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
      const content = document.createElement("div");
      const title = document.createElement("strong");
      const body = document.createElement("p");
      const closeButton = document.createElement("button");

      item.className = "app-reminder";
      item.dataset.reminderTag = reminder.tag;
      item.setAttribute("role", "alert");
      content.className = "app-reminder-content";
      title.textContent = reminder.title;
      body.textContent = reminder.body;
      closeButton.type = "button";
      closeButton.className = "app-reminder-close";
      closeButton.setAttribute("aria-label", "关闭提醒");
      closeButton.textContent = "×";
      closeButton.addEventListener("click", function () {
        dismiss(item);
      });

      content.appendChild(title);
      content.appendChild(body);
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
