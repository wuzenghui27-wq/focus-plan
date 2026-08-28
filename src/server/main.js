import http from "node:http";
import { loadConfig } from "./config.js";
import { createDependencies } from "./dependencies.js";
import { createApiHandler } from "./http/api-handler.js";
import { createStaticHandler } from "./http/static-handler.js";

const config = loadConfig();
const dependencies = createDependencies(config);
const handleApi = createApiHandler({
  store: dependencies.store,
  pushService: dependencies.pushService,
  dictionaryService: dependencies.dictionaryService
});
const handleStatic = createStaticHandler(config.projectRoot);

const server = http.createServer(async function (request, response) {
  const url = new URL(request.url, `http://${config.host}:${config.port}`);

  if (url.pathname.startsWith("/api/")) {
    if (!await handleApi(request, response, url)) {
      response.writeHead(404);
      response.end("Not found");
    }
    return;
  }

  handleStatic(request, response, url);
});

server.listen(config.port, config.host, function () {
  dependencies.reminderScheduler.start();
  console.log(`FanP is running at http://${config.host}:${config.port}`);
});

function shutDown() {
  dependencies.reminderScheduler.stop();
  server.close(function () {
    dependencies.store.close();
    process.exit(0);
  });
}

process.on("SIGINT", shutDown);
process.on("SIGTERM", shutDown);
