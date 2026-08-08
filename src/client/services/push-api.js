function urlBase64ToUint8Array(value) {
  const padding = "=".repeat((4 - value.length % 4) % 4);
  const base64 = (value + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const rawData = typeof window === "undefined"
    ? Buffer.from(base64, "base64").toString("binary")
    : window.atob(base64);

  return Uint8Array.from(rawData, function (character) {
    return character.charCodeAt(0);
  });
}

function createPushApi(fetchFunction, baseUrl) {
  const normalizedBaseUrl = String(baseUrl || "/api").replace(/\/+$/, "");

  async function request(path, options) {
    const response = await fetchFunction(normalizedBaseUrl + path, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options?.headers || {})
      }
    });
    const body = await response.json();

    if (!response.ok) {
      const error = new Error(body.error || "推送服务请求失败。");
      error.status = response.status;
      throw error;
    }

    return body;
  }

  return {
    getConfig: function () {
      return request("/push/config");
    },
    saveSubscription: function (subscription) {
      return request("/push/subscriptions", {
        method: "POST",
        body: JSON.stringify({ subscription })
      });
    },
    deleteSubscription: function (endpoint) {
      return request("/push/subscriptions", {
        method: "DELETE",
        body: JSON.stringify({ endpoint })
      });
    },
    sendTest: function (endpoint) {
      return request("/push/test", {
        method: "POST",
        body: JSON.stringify({ endpoint })
      });
    },
    syncReminders: function (endpoint, reminders) {
      return request("/push/reminders", {
        method: "PUT",
        body: JSON.stringify({ endpoint, reminders })
      });
    }
  };
}


export {
  createPushApi,
  urlBase64ToUint8Array
};
