import fs from "node:fs";
import path from "node:path";

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".wav": "audio/wav"
};

function createStaticHandler(projectRoot) {
  return function handleStatic(request, response, url) {
    const requestedPath = decodeURIComponent(url.pathname);
    const relativePath = requestedPath === "/"
      ? "index.html"
      : requestedPath.slice(1);
    const filePath = path.resolve(projectRoot, relativePath);

    if (filePath !== projectRoot && !filePath.startsWith(projectRoot + path.sep)) {
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
      response.writeHead(200, {
        "Content-Type": MIME_TYPES[path.extname(filePath).toLowerCase()] ||
          "application/octet-stream",
        "Cache-Control": "no-store"
      });
      response.end(file);
    });
  };
}

export { createStaticHandler };
