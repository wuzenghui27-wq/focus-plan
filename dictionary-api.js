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
      const response = await fetchImpl(
        apiBaseUrl + "/dictionary?q=" + encodeURIComponent(query),
        { headers: { Accept: "application/json" } }
      );
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
