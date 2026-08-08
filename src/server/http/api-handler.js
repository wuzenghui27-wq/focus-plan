import { createAccountRoutes } from "./routes/account-routes.js";
import { createDictionaryRoutes } from "./routes/dictionary-routes.js";
import { createPushRoutes } from "./routes/push-routes.js";
import { sendJson } from "./http.js";
import {
  createSessionReader,
  hashValue,
  normalizePhone
} from "./session.js";

function createApiHandler({
  store,
  secret,
  isDevelopment,
  pushService,
  dictionaryService
}) {
  const getSession = createSessionReader(store, secret);
  const routeHandlers = [
    createDictionaryRoutes(dictionaryService),
    createPushRoutes({ store, pushService }),
    createAccountRoutes({ store, secret, isDevelopment, getSession })
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

export { createApiHandler, hashValue, normalizePhone };
