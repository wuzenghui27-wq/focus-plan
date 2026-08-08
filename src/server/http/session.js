import crypto from "node:crypto";
import { getCookie } from "./http.js";

function hashValue(value, secret) {
  return crypto.createHmac("sha256", secret).update(value).digest("hex");
}

function normalizePhone(value) {
  const phone = String(value || "").replace(/\s+/g, "");
  return /^1\d{10}$/.test(phone) ? phone : "";
}

function createSessionReader(store, secret) {
  return function getSession(request) {
    const token = getCookie(request, "focus_plan_session");
    return {
      token,
      user: token
        ? store.getUserBySession(hashValue(token, secret), Date.now())
        : null
    };
  };
}

export { createSessionReader, hashValue, normalizePhone };
