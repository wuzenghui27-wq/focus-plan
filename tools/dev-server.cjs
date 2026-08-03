const fs = require("fs");
const http = require("http");
const path = require("path");
const { createAccountStore } = require("../server/account-store.cjs");
const { createApiHandler } = require("../server/api-handler.cjs");
const { createPushService } = require("../server/push-service.cjs");
const { createCedictStore } = require("../server/cedict-store.cjs");
const {
  getChineseFrequencyRank
} = require("../server/chinese-frequency.cjs");
const { createEcdictProvider } = require("../server/ecdict-provider.cjs");
const {
  createFreeDictionaryProvider
} = require("../server/free-dictionary-provider.cjs");
const { createOpenDictionary } = require("../server/open-dictionary.cjs");
const { createTatoebaProvider } = require("../server/tatoeba-provider.cjs");
const {
  createWiktionaryProvider
} = require("../server/wiktionary-provider.cjs");
const {
  createReminderScheduler
} = require("../server/reminder-scheduler.cjs");

const HOST = process.env.HOST || "127.0.0.1";
const PORT = Number(process.env.PORT) || 5500;
const ROOT = path.resolve(__dirname, "..");
const databasePath = process.env.DATABASE_PATH ||
  path.join(ROOT, ".data", "focus-plan.db");
const accountStore = createAccountStore(
  databasePath
);

const pushService = createPushService({
  subject: process.env.VAPID_SUBJECT,
  publicKey: process.env.VAPID_PUBLIC_KEY,
  privateKey: process.env.VAPID_PRIVATE_KEY
});
const cedict = createCedictStore({
  filePath: path.join(ROOT, ".data", "cedict_1_0_ts_utf-8_mdbg.txt.gz"),
  getFrequencyRank: getChineseFrequencyRank
});
const ecdict = createEcdictProvider();
const englishDictionary = createFreeDictionaryProvider({
  cacheDirectory: path.join(ROOT, ".data", "dictionary-cache")
});
const exampleDictionary = createTatoebaProvider({
  cacheDirectory: path.join(ROOT, ".data", "dictionary-cache")
});
const fallbackEnglishDictionary = createWiktionaryProvider({
  cacheDirectory: path.join(ROOT, ".data", "dictionary-cache")
});
const dictionaryService = createOpenDictionary({
  cedict,
  translationProvider: ecdict,
  englishProvider: fallbackEnglishDictionary,
  englishProviderName: "Wiktionary",
  fallbackEnglishProvider: englishDictionary,
  fallbackEnglishProviderName: "Free Dictionary API",
  exampleProvider: exampleDictionary
});
const handleApi = createApiHandler({
  store: accountStore,
  secret: process.env.SESSION_SECRET || "local-development-secret",
  isDevelopment: true,
  pushService,
  dictionaryService
});
const reminderScheduler = createReminderScheduler({
  store: accountStore,
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
  reminderScheduler.start();
  console.log(`FanP is running at http://${HOST}:${PORT}`);
});

function shutDown() {
  reminderScheduler.stop();
  server.close(function () {
    accountStore.close();
    process.exit(0);
  });
}

process.on("SIGINT", shutDown);
process.on("SIGTERM", shutDown);
