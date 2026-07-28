const crypto = require("crypto");
const SyncTools = require("../sync-tools.js");

const CODE_LIFETIME_MS = 5 * 60 * 1000;
const SESSION_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000;

function hashValue(value, secret) {
  return crypto.createHmac("sha256", secret).update(value).digest("hex");
}

function normalizePhone(value) {
  const phone = String(value || "").replace(/\s+/g, "");
  return /^1\d{10}$/.test(phone) ? phone : "";
}

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

function sendJson(response, status, value, headers) {
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

function createApiHandler({ store, secret, isDevelopment }) {
  function getSession(request) {
    const token = getCookie(request, "focus_plan_session");
    return {
      token,
      user: token
        ? store.getUserBySession(hashValue(token, secret), Date.now())
        : null
    };
  }

  return async function handleApi(request, response, url) {
    try {
      if (request.method === "GET" && url.pathname === "/api/account") {
        const { user } = getSession(request);
        sendJson(response, 200, {
          account: user ? { id: user.id, phone: user.phone } : null
        });
        return true;
      }

      if (request.method === "POST" && url.pathname === "/api/auth/phone/code") {
        const phone = normalizePhone((await readJson(request)).phone);
        if (!phone) {
          sendJson(response, 400, { error: "请输入正确的中国大陆手机号。" });
          return true;
        }
        const code = String(crypto.randomInt(100000, 1000000));
        store.savePhoneCode(
          phone,
          hashValue(phone + ":" + code, secret),
          Date.now() + CODE_LIFETIME_MS
        );
        console.log(`[development verification code] ${phone}: ${code}`);
        sendJson(response, 200, {
          ok: true,
          developmentCode: isDevelopment ? code : undefined
        });
        return true;
      }

      if (request.method === "POST" && url.pathname === "/api/auth/phone/verify") {
        const body = await readJson(request);
        const phone = normalizePhone(body.phone);
        const code = String(body.code || "");
        const valid = phone && /^\d{6}$/.test(code) &&
          store.consumePhoneCode(
            phone,
            hashValue(phone + ":" + code, secret),
            Date.now()
          );
        if (!valid) {
          sendJson(response, 401, { error: "验证码错误或已过期。" });
          return true;
        }
        const user = store.getOrCreateUser(phone, new Date().toISOString());
        const token = crypto.randomBytes(32).toString("base64url");
        store.createSession(
          hashValue(token, secret),
          user.id,
          Date.now() + SESSION_LIFETIME_MS
        );
        sendJson(response, 200, {
          account: { id: user.id, phone: user.phone }
        }, {
          "Set-Cookie": `focus_plan_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_LIFETIME_MS / 1000}`
        });
        return true;
      }

      if (
        request.method === "GET" &&
        ["/api/auth/wechat/start", "/api/auth/qq/start"].includes(url.pathname)
      ) {
        sendJson(response, 501, { error: "第三方平台凭据尚未配置。" });
        return true;
      }

      const session = getSession(request);
      if (
        ["/api/sync", "/api/auth/sign-out"].includes(url.pathname) &&
        !session.user
      ) {
        sendJson(response, 401, { error: "请先登录。" });
        return true;
      }

      if (request.method === "GET" && url.pathname === "/api/sync") {
        sendJson(response, 200, {
          snapshot: store.getSnapshot(session.user.id)
        });
        return true;
      }

      if (request.method === "PUT" && url.pathname === "/api/sync") {
        const snapshot = SyncTools.validateSyncSnapshot(await readJson(request));
        store.saveSnapshot(session.user.id, snapshot);
        sendJson(response, 200, { snapshot });
        return true;
      }

      if (request.method === "POST" && url.pathname === "/api/auth/sign-out") {
        store.deleteSession(hashValue(session.token, secret));
        sendJson(response, 200, { ok: true }, {
          "Set-Cookie": "focus_plan_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0"
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error("API request failed:", error);
      sendJson(response, 400, { error: error.message });
      return true;
    }
  };
}

module.exports = { createApiHandler, normalizePhone, hashValue };
