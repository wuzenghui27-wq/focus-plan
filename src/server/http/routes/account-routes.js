import crypto from "node:crypto";
import * as SyncTools from "../../../domain/sync.js";
import { readJson, sendJson } from "../http.js";
import { hashValue, normalizePhone } from "../session.js";

const CODE_LIFETIME_MS = 5 * 60 * 1000;
const SESSION_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000;

function createAccountRoutes({ store, secret, isDevelopment, getSession }) {
  return async function handleAccountRoute(request, response, url) {
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
      const valid = phone && /^\d{6}$/.test(code) && store.consumePhoneCode(
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

    if (request.method === "GET" && [
      "/api/auth/wechat/start",
      "/api/auth/qq/start"
    ].includes(url.pathname)) {
      sendJson(response, 501, { error: "第三方平台凭据尚未配置。" });
      return true;
    }

    if (!["/api/sync", "/api/auth/sign-out"].includes(url.pathname)) {
      return false;
    }
    const session = getSession(request);
    if (!session.user) {
      sendJson(response, 401, { error: "请先登录。" });
      return true;
    }

    if (request.method === "GET" && url.pathname === "/api/sync") {
      sendJson(response, 200, { snapshot: store.getSnapshot(session.user.id) });
      return true;
    }

    if (request.method === "PUT" && url.pathname === "/api/sync") {
      const expectedUpdatedAt = request.headers["if-match"];
      const currentSnapshot = store.getSnapshot(session.user.id);
      const currentUpdatedAt = currentSnapshot?.updatedAt || "null";
      if (expectedUpdatedAt !== undefined && expectedUpdatedAt !== currentUpdatedAt) {
        sendJson(response, 409, {
          error: "云端数据已在其他设备更新，请先处理同步冲突。"
        });
        return true;
      }
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
  };
}

export { createAccountRoutes };
