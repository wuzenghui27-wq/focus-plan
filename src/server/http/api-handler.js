import { createDictionaryRoutes } from "./routes/dictionary-routes.js";
import { createPushRoutes } from "./routes/push-routes.js";
import { sendJson } from "./http.js";

function createApiHandler({ store, pushService, dictionaryService }) {
  const routeHandlers = [
    createDictionaryRoutes(dictionaryService),
    createPushRoutes({ store, pushService })
  ];

  return async function handleApi(request, response, url) {
    try {
      for (const handleRoute of routeHandlers) {
        if (await handleRoute(request, response, url)) {
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error("API request failed:", error);
      sendJson(response, 400, { error: error.message });
      return true;
    }
  };
}

export { createApiHandler };
