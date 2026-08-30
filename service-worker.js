const CACHE_NAME = "focus-plan-shell-v30";
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./assets/icons/app-icon-192.png",
  "./assets/icons/app-icon-512.png",
  "./assets/icons/fanp-logo.png",
  "./assets/icons/apple-touch-icon.png",
  "./styles/app.css",
  "./styles/base.css",
  "./styles/components.css",
  "./styles/pages.css",
  "./styles/responsive.css",
  "./styles/theme.css",
  "./styles/tokens.css",
  "./src/client/app.js",
  "./src/client/application.js",
  "./src/client/core/context.js",
  "./src/client/core/offline.js",
  "./src/client/core/persistence-events.js",
  "./src/client/core/shortcuts.js",
  "./src/client/core/view-helpers.js",
  "./src/client/features/dictionary.js",
  "./src/client/features/focus.js",
  "./src/client/features/history.js",
  "./src/client/features/navigation.js",
  "./src/client/features/plans.js",
  "./src/client/features/reminders.js",
  "./src/client/features/settings.js",
  "./src/client/services/dictionary-api.js",
  "./src/client/services/push-api.js",
  "./src/client/ui/reminder-presenter.js",
  "./src/client/ui/select-menu.js",
  "./src/domain/dictionary.js",
  "./src/domain/goals.js",
  "./src/domain/navigation.js",
  "./src/domain/plan-form.js",
  "./src/domain/plans.js",
  "./src/domain/pomodoro.js",
  "./src/domain/push-reminders.js",
  "./src/domain/recurrence.js",
  "./src/domain/reminders.js",
  "./src/domain/sessions.js",
  "./src/domain/shortcuts.js",
  "./src/domain/sound.js",
  "./src/domain/storage.js",
  "./src/domain/subtasks.js",
  "./src/domain/text.js",
  "./src/domain/theme.js",
  "./src/domain/timer-state.js",
  "./src/domain/timer.js",
  "./src/domain/undo.js"
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function (cache) {
        return cache.addAll(APP_SHELL);
      })
      .then(function () {
        return self.skipWaiting();
      })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys()
      .then(function (cacheNames) {
        return Promise.all(
          cacheNames
            .filter(function (cacheName) {
              return cacheName !== CACHE_NAME;
            })
            .map(function (cacheName) {
              return caches.delete(cacheName);
            })
        );
      })
      .then(function () {
        return self.clients.claim();
      })
  );
});

function handleNavigationRequest(request) {
  return fetch(request)
    .then(function (response) {
      if (response.ok) {
        const responseCopy = response.clone();

        caches.open(CACHE_NAME).then(function (cache) {
          cache.put("./index.html", responseCopy);
        });
      }

      return response;
    })
    .catch(function () {
      return caches.match("./index.html");
    });
}

function handleAssetRequest(request) {
  return fetch(request)
    .then(function (response) {
      if (response.ok) {
        const responseCopy = response.clone();

        caches.open(CACHE_NAME).then(function (cache) {
          cache.put(request, responseCopy);
        });
      }

      return response;
    })
    .catch(function () {
      return caches.match(request);
    });
}

self.addEventListener("fetch", function (event) {
  const request = event.request;
  const requestUrl = new URL(request.url);

  if (request.method !== "GET" || requestUrl.origin !== self.location.origin) {
    return;
  }

  if (requestUrl.pathname.startsWith("/api/")) {
    return;
  }

  event.respondWith(
    request.mode === "navigate"
      ? handleNavigationRequest(request)
      : handleAssetRequest(request)
  );
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  const relativeTarget = event.notification.data?.url || "./#plans";
  const targetUrl = new URL(relativeTarget, self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({
      type: "window",
      includeUncontrolled: true
    }).then(function (windowClients) {
      if (windowClients.length > 0) {
        return windowClients[0].navigate(targetUrl).then(function (client) {
          return client.focus();
        });
      }

      return self.clients.openWindow(targetUrl);
    })
  );
});

function showPushNotification(payload) {
  return self.registration.showNotification(payload.title, {
    body: payload.body,
    tag: payload.tag,
    icon: "./assets/icons/app-icon-192.png",
    data: {
      url: payload.url,
      planId: payload.planId ?? null
    }
  });
}

self.addEventListener("push", function (event) {
  const fallback = {
    title: "FanP",
    body: "你有一条新的计划提醒。",
    tag: "focus-plan-push",
    url: "./#plans"
  };
  let payload = fallback;

  if (event.data) {
    try {
      payload = { ...fallback, ...event.data.json() };
    } catch (error) {
      payload = { ...fallback, body: event.data.text() };
    }
  }

  event.waitUntil(
    self.clients.matchAll({
      type: "window",
      includeUncontrolled: true
    }).then(function (windowClients) {
      const visibleClient = windowClients.find(function (client) {
        return client.visibilityState === "visible";
      });

      if (visibleClient) {
        visibleClient.postMessage({
          type: "FOCUS_PLAN_BACKGROUND_REMINDER",
          payload
        });
        return;
      }

      return showPushNotification(payload);
    })
  );
});
