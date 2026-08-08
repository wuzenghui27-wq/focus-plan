import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../.."
);

function loadConfig(environment = process.env) {
  return {
    host: environment.HOST || "127.0.0.1",
    port: Number(environment.PORT) || 5500,
    projectRoot,
    databasePath: environment.DATABASE_PATH ||
      path.join(projectRoot, ".data", "focus-plan.db"),
    sessionSecret: environment.SESSION_SECRET || "local-development-secret",
    vapid: {
      subject: environment.VAPID_SUBJECT,
      publicKey: environment.VAPID_PUBLIC_KEY,
      privateKey: environment.VAPID_PRIVATE_KEY
    }
  };
}

export { loadConfig, projectRoot };
