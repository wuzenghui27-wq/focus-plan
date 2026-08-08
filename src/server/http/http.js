function readJson(request) {
  return new Promise(function (resolve, reject) {
    let body = "";

    request.on("data", function (chunk) {
      body += chunk;
      if (body.length > 1024 * 1024) {
        reject(new Error("请求内容过大。"));
        request.destroy();
      }
    });
    request.on("end", function () {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(new Error("JSON 格式错误。"));
      }
    });
    request.on("error", reject);
  });
}

function sendJson(response, status, value, headers = {}) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    ...headers
  });
  response.end(JSON.stringify(value));
}

function getCookie(request, name) {
  for (const cookie of String(request.headers.cookie || "").split(";")) {
    const [key, ...parts] = cookie.trim().split("=");
    if (key === name) {
      return decodeURIComponent(parts.join("="));
    }
  }
  return "";
}

export { getCookie, readJson, sendJson };
