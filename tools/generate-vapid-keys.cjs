const fs = require("fs");
const path = require("path");
const webPush = require("web-push");

const projectRoot = path.resolve(__dirname, "..");
const envPath = path.join(projectRoot, ".env");
const existing = fs.existsSync(envPath)
  ? fs.readFileSync(envPath, "utf8")
  : "";

const hasPublicKey = /^VAPID_PUBLIC_KEY=.+$/m.test(existing);
const hasPrivateKey = /^VAPID_PRIVATE_KEY=.+$/m.test(existing);

if (hasPublicKey && hasPrivateKey) {
  console.log("VAPID keys already exist in .env; no changes made.");
  process.exit(0);
}

if (hasPublicKey || hasPrivateKey) {
  throw new Error(
    ".env contains only part of the VAPID key pair; fix it before generating."
  );
}

const keys = webPush.generateVAPIDKeys();
const separator = existing === "" || existing.endsWith("\n") ? "" : "\n";
const content = separator +
  "VAPID_SUBJECT=mailto:focus-plan@example.com\n" +
  "VAPID_PUBLIC_KEY=" + keys.publicKey + "\n" +
  "VAPID_PRIVATE_KEY=" + keys.privateKey + "\n";

fs.appendFileSync(envPath, content, { encoding: "utf8", mode: 0o600 });
console.log("Created local VAPID keys in .env.");
