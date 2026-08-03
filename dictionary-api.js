(function (root, factory) {
  const api = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }

  root.DictionaryApi = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function createDictionaryApi(fetchImpl, baseUrl) {
    const apiBaseUrl = String(baseUrl || "/api").replace(/\/$/, "");

    async function lookup(query) {
      let response;
      try {
        response = await fetchImpl(
          apiBaseUrl + "/dictionary?q=" + encodeURIComponent(query),
          { headers: { Accept: "application/json" } }
        );
      } catch (error) {
        throw new Error("无法连接查词服务，请确认 FanP 服务正在运行。");
      }
      const body = await response.json().catch(function () {
        return {};
      });

      if (!response.ok) {
        throw new Error(body.error || "查词服务暂时不可用。");
      }

      return body.result;
    }

    return { lookup: lookup };
  }

  return { createDictionaryApi: createDictionaryApi };
});
