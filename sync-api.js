(function (root, factory) {
  const tools = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = tools;
  }

  root.SyncApi = tools;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const SOCIAL_PROVIDERS = new Set(["wechat", "qq"]);

  function createSyncApi(fetchFunction, baseUrl) {
    if (typeof fetchFunction !== "function") {
      throw new TypeError("A fetch function is required.");
    }

    const normalizedBaseUrl = String(baseUrl || "/api").replace(/\/+$/, "");

    async function request(path, options) {
      const response = await fetchFunction(normalizedBaseUrl + path, {
        credentials: "include",
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...(options?.headers || {})
        }
      });

      if (!response.ok) {
        let message = "账号服务请求失败。";

        try {
          const errorBody = await response.json();
          message = errorBody.error || message;
        } catch (parseError) {
          // Keep the generic message when the server did not return JSON.
        }

        const error = new Error(message);

        error.status = response.status;
        throw error;
      }

      if (response.status === 204) {
        return null;
      }

      return response.json();
    }

    function getSocialLoginUrl(provider) {
      if (!SOCIAL_PROVIDERS.has(provider)) {
        throw new TypeError("Unsupported social login provider.");
      }

      return normalizedBaseUrl + "/auth/" + provider + "/start";
    }

    return {
      getAccount: function () {
        return request("/account");
      },
      getSocialLoginUrl,
      sendPhoneCode: function (phone) {
        return request("/auth/phone/code", {
          method: "POST",
          body: JSON.stringify({ phone })
        });
      },
      verifyPhoneCode: function (phone, code) {
        return request("/auth/phone/verify", {
          method: "POST",
          body: JSON.stringify({ phone, code })
        });
      },
      downloadSnapshot: function () {
        return request("/sync");
      },
      uploadSnapshot: function (snapshot, expectedUpdatedAt) {
        const headers = {};

        if (expectedUpdatedAt !== undefined) {
          headers["If-Match"] = expectedUpdatedAt || "null";
        }

        return request("/sync", {
          method: "PUT",
          headers,
          body: JSON.stringify(snapshot)
        });
      },
      signOut: function () {
        return request("/auth/sign-out", { method: "POST" });
      }
    };
  }

  return { createSyncApi };
});
