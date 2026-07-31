(function () {
  const mobileQuery = window.matchMedia("(max-width: 900px)");
  const selectValueDescriptor = Object.getOwnPropertyDescriptor(
    HTMLSelectElement.prototype,
    "value"
  );
  let openController = null;
  let menuId = 0;
  const controllers = [];

  function getEnabledOptions(menu) {
    return [...menu.querySelectorAll('[role="option"]:not(:disabled)')];
  }

  function focusRelativeOption(menu, currentOption, offset) {
    const options = getEnabledOptions(menu);
    const currentIndex = options.indexOf(currentOption);

    if (options.length === 0) {
      return;
    }

    const nextIndex = (currentIndex + offset + options.length) % options.length;
    options[nextIndex].focus();
  }

  function positionMenu(trigger, menu) {
    const rect = trigger.getBoundingClientRect();
    const pagePadding = 12;
    const gap = 6;
    const menuWidth = Math.max(rect.width, 132);
    const availableBelow = window.innerHeight - rect.bottom - pagePadding;
    const availableAbove = rect.top - pagePadding;
    const openAbove = availableBelow < 190 && availableAbove > availableBelow;
    const maximumHeight = Math.max(140, Math.min(320, openAbove
      ? availableAbove - gap
      : availableBelow - gap));

    menu.style.width = menuWidth + "px";
    menu.style.maxHeight = maximumHeight + "px";
    menu.style.left = Math.max(
      pagePadding,
      Math.min(rect.left, window.innerWidth - menuWidth - pagePadding)
    ) + "px";

    if (openAbove) {
      menu.style.top = "auto";
      menu.style.bottom = window.innerHeight - rect.top + gap + "px";
    } else {
      menu.style.top = rect.bottom + gap + "px";
      menu.style.bottom = "auto";
    }
  }

  function enhanceSelect(select) {
    if (select.multiple || select.dataset.selectMenuReady === "true") {
      return;
    }

    menuId += 1;
    const wrapper = document.createElement("span");
    const trigger = document.createElement("button");
    const triggerLabel = document.createElement("span");
    const menu = document.createElement("div");
    const originalTabIndex = select.getAttribute("tabindex");
    const originalAriaHidden = select.getAttribute("aria-hidden");
    const controller = {
      select: select,
      trigger: trigger,
      menu: menu,
      close: closeMenu,
      position: function () {
        positionMenu(trigger, menu);
      },
      sync: sync,
      syncMode: syncMode
    };

    wrapper.className = "select-menu";
    trigger.className = "select-menu-trigger";
    trigger.type = "button";
    trigger.setAttribute("aria-haspopup", "listbox");
    trigger.setAttribute("aria-expanded", "false");
    triggerLabel.className = "select-menu-trigger-label";
    menu.className = "select-menu-popup";
    menu.id = "selectMenuPopup" + menuId;
    menu.hidden = true;
    menu.setAttribute("role", "listbox");
    trigger.setAttribute("aria-controls", menu.id);

    select.dataset.selectMenuReady = "true";
    select.classList.add("select-menu-native");
    select.parentNode.insertBefore(wrapper, select);
    wrapper.appendChild(select);
    trigger.appendChild(triggerLabel);
    wrapper.appendChild(trigger);
    document.body.appendChild(menu);

    function closeMenu(options) {
      const shouldRestoreFocus = options?.restoreFocus === true;

      menu.hidden = true;
      trigger.setAttribute("aria-expanded", "false");

      if (openController === controller) {
        openController = null;
      }

      if (shouldRestoreFocus) {
        trigger.focus();
      }
    }

    function chooseOption(optionButton) {
      if (optionButton.disabled) {
        return;
      }

      select.value = optionButton.dataset.value;
      select.dispatchEvent(new Event("change", { bubbles: true }));
      sync();
      closeMenu({ restoreFocus: true });
    }

    function buildOptions() {
      menu.innerHTML = "";

      [...select.options].forEach(function (option) {
        const optionButton = document.createElement("button");
        optionButton.className = "select-menu-option";
        optionButton.type = "button";
        optionButton.textContent = option.textContent;
        optionButton.dataset.value = option.value;
        optionButton.disabled = option.disabled;
        optionButton.setAttribute("role", "option");
        optionButton.setAttribute(
          "aria-selected",
          option.selected ? "true" : "false"
        );
        optionButton.classList.toggle("is-selected", option.selected);

        optionButton.addEventListener("click", function () {
          chooseOption(optionButton);
        });

        optionButton.addEventListener("keydown", function (event) {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            focusRelativeOption(
              menu,
              optionButton,
              event.key === "ArrowDown" ? 1 : -1
            );
          } else if (event.key === "Home" || event.key === "End") {
            event.preventDefault();
            const options = getEnabledOptions(menu);
            options[event.key === "Home" ? 0 : options.length - 1]?.focus();
          } else if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            chooseOption(optionButton);
          } else if (event.key === "Escape") {
            event.preventDefault();
            closeMenu({ restoreFocus: true });
          }
        });

        menu.appendChild(optionButton);
      });
    }

    function sync() {
      const selectedOption = select.options[select.selectedIndex];
      triggerLabel.textContent = selectedOption?.textContent || "";
      trigger.disabled = select.disabled;
      trigger.setAttribute("aria-disabled", select.disabled ? "true" : "false");
      buildOptions();
    }

    function syncMode() {
      if (mobileQuery.matches) {
        select.setAttribute("aria-hidden", "true");
        select.setAttribute("tabindex", "-1");
        return;
      }

      if (originalAriaHidden === null) {
        select.removeAttribute("aria-hidden");
      } else {
        select.setAttribute("aria-hidden", originalAriaHidden);
      }

      if (originalTabIndex === null) {
        select.removeAttribute("tabindex");
      } else {
        select.setAttribute("tabindex", originalTabIndex);
      }
    }

    function openMenu() {
      if (!mobileQuery.matches || select.disabled) {
        return;
      }

      if (openController && openController !== controller) {
        openController.close();
      }

      sync();
      menu.hidden = false;
      trigger.setAttribute("aria-expanded", "true");
      positionMenu(trigger, menu);
      openController = controller;
      menu.querySelector(".is-selected:not(:disabled)")?.focus();
    }

    trigger.addEventListener("click", function () {
      if (menu.hidden) {
        openMenu();
      } else {
        closeMenu();
      }
    });

    trigger.addEventListener("keydown", function (event) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
        event.preventDefault();
        openMenu();
      }
    });

    select.addEventListener("change", sync);
    select.addEventListener("focus", function () {
      if (mobileQuery.matches) {
        trigger.focus();
      }
    });

    const observer = new MutationObserver(sync);
    observer.observe(select, {
      attributes: true,
      childList: true,
      subtree: true
    });

    if (selectValueDescriptor) {
      Object.defineProperty(select, "value", {
        configurable: true,
        get: function () {
          return selectValueDescriptor.get.call(select);
        },
        set: function (value) {
          selectValueDescriptor.set.call(select, value);
          queueMicrotask(sync);
        }
      });
    }

    select.form?.addEventListener("reset", function () {
      queueMicrotask(sync);
    });

    controllers.push(controller);
    syncMode();
    sync();
  }

  document.querySelectorAll("select").forEach(enhanceSelect);

  document.addEventListener("pointerdown", function (event) {
    if (!openController) {
      return;
    }

    if (!openController.menu.contains(event.target) &&
        !openController.trigger.contains(event.target)) {
      openController.close();
    }
  });

  window.addEventListener("resize", function () {
    openController?.close();
  });

  window.addEventListener("scroll", function () {
    if (openController) {
      window.requestAnimationFrame(openController.position);
    }
  }, { passive: true });

  mobileQuery.addEventListener("change", function () {
    openController?.close();
    controllers.forEach(function (controller) {
      controller.syncMode();
    });
  });
})();
