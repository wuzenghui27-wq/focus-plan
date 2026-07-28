const CACHE_NAME = "focus-plan-shell-v5";
const APP_SHELL = [
  "./",
  "./index.html",
  "./style.css",
  "./manifest.webmanifest",
  "./assets/icons/app-icon-192.png",
  "./assets/icons/app-icon-512.png",
  "./assets/icons/apple-touch-icon.png",
  "./achievement-rules.js",
  "./goal-tools.js",
  "./navigation-tools.js",
  "./plan-tools.js",
  "./pomodoro-tools.js",
  "./recurrence-tools.js",
  "./reminder-presenter.js",
  "./reminder-tools.js",
  "./script.js",
  "./session-tools.js",
  "./shortcut-tools.js",
  "./sound-tools.js",
  "./storage-tools.js",
  "./subtask-tools.js",
  "./sync-api.js",
  "./sync-tools.js",
  "./text-tools.js",
  "./theme-tools.js",
  "./timer-state-tools.js",
  "./timer-tools.js",
  "./undo-tools.js"
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
  event.waitUntil(
    self.clients.matchAll({
      type: "window",
      includeUncontrolled: true
    }).then(function (windowClients) {
      if (windowClients.length > 0) {
        return windowClients[0].focus();
      }

      return self.clients.openWindow("./#plans");
    })
  );
});
