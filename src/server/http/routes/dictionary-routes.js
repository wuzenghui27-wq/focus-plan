import { sendJson } from "../http.js";

function createDictionaryRoutes(dictionaryService) {
  return async function handleDictionaryRoute(request, response, url) {
    if (request.method !== "GET" || url.pathname !== "/api/dictionary") {
      return false;
    }

    if (!dictionaryService?.isConfigured()) {
      sendJson(response, 503, { error: "开源词典服务尚未准备完成。" });
      return true;
    }

    try {
      const result = await dictionaryService.lookup(url.searchParams.get("q"));
      sendJson(response, 200, { result });
    } catch (error) {
      sendJson(response, error.statusCode || 502, {
        error: error.message || "查词服务暂时不可用。"
      });
    }
    return true;
  };
}

export { createDictionaryRoutes };
