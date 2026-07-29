const fs = require("fs");
const http = require("http");
const path = require("path");
const { createAccountStore } = require("../server/account-store.cjs");
const { createApiHandler } = require("../server/api-handler.cjs");
const { createPushService } = require("../server/push-service.cjs");

const HOST = process.env.HOST || "127.0.0.1";
const PORT = Number(process.env.PORT) || 5500;
const ROOT = path.resolve(__dirname, "..");
const accountStore = createAccountStore(
  path.join(ROOT, ".data", "focus-plan.db")
);
const pushService = createPushService({
  subject: process.env.VAPID_SUBJECT,
  publicKey: process.env.VAPID_PUBLIC_KEY,
  privateKey: process.env.VAPID_PRIVATE_KEY
});
const handleApi = createApiHandler({
  store: accountStore,
  secret: process.env.SESSION_SECRET || "local-development-secret",
  isDevelopment: true,
  pushService
});

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".wav": "audio/wav"
};

const server = http.createServer(async function (request, response) {
  const url = new URL(request.url, `http://${HOST}:${PORT}`);

  if (url.pathname.startsWith("/api/")) {
    if (!await handleApi(request, response, url)) {
      response.writeHead(404);
      response.end("Not found");
    }
    return;
  }
  const requestedPath = decodeURIComponent(url.pathname);
  const relativePath = requestedPath === "/" ? "index.html" : requestedPath.slice(1);
  const filePath = path.resolve(ROOT, relativePath);

  if (filePath !== ROOT && !filePath.startsWith(ROOT + path.sep)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  fs.readFile(filePath, function (error, file) {
    if (error) {
      response.writeHead(error.code === "ENOENT" ? 404 : 500);
      response.end(error.code === "ENOENT" ? "Not found" : "Server error");
      return;
    }

    const extension = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[extension] || "application/octet-stream";

    response.writeHead(200, {
      "Content-Type": contentType,
      "Cache-Control": "no-store"
    });
    response.end(file);
  });
});

server.listen(PORT, HOST, function () {
  console.log(`Focus Plan is running at http://${HOST}:${PORT}`);
});
