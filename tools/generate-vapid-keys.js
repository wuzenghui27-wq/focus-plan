import fs from "node:fs";
import path from "node:path";
import webPush from "web-push";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envPath = path.join(projectRoot, ".env");
const existing = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";
const hasPublicKey = /^VAPID_PUBLIC_KEY=.+$/m.test(existing);
const hasPrivateKey = /^VAPID_PRIVATE_KEY=.+$/m.test(existing);

if (hasPublicKey && hasPrivateKey) {
  console.log("VAPID keys already exist in .env; no changes made.");
} else if (hasPublicKey || hasPrivateKey) {
  throw new Error(
    ".env contains only part of the VAPID key pair; fix it before generating."
  );
} else {
  const keys = webPush.generateVAPIDKeys();
  const separator = existing === "" || existing.endsWith("\n") ? "" : "\n";
  const content = separator +
    "VAPID_SUBJECT=mailto:focus-plan@example.com\n" +
    "VAPID_PUBLIC_KEY=" + keys.publicKey + "\n" +
    "VAPID_PRIVATE_KEY=" + keys.privateKey + "\n";
  fs.appendFileSync(envPath, content, { encoding: "utf8", mode: 0o600 });
  console.log("Created local VAPID keys in .env.");
}
