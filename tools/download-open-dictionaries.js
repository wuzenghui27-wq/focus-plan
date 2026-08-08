import fs from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceUrl = "https://www.mdbg.net/chinese/export/cedict/" +
  "cedict_1_0_ts_utf-8_mdbg.txt.gz";
const targetPath = path.join(
  projectRoot,
  ".data",
  "cedict_1_0_ts_utf-8_mdbg.txt.gz"
);

try {
  const response = await fetch(sourceUrl);
  if (!response.ok || !response.body) {
    throw new Error("CC-CEDICT 下载失败：HTTP " + response.status);
  }
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  await pipeline(Readable.fromWeb(response.body), fs.createWriteStream(targetPath));
  console.log("CC-CEDICT 已下载到 " + targetPath);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
