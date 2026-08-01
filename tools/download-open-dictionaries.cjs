const fs = require("fs");
const path = require("path");
const { Readable } = require("stream");
const { pipeline } = require("stream/promises");

const SOURCE_URL = "https://www.mdbg.net/chinese/export/cedict/" +
  "cedict_1_0_ts_utf-8_mdbg.txt.gz";
const targetPath = path.resolve(
  __dirname,
  "../.data/cedict_1_0_ts_utf-8_mdbg.txt.gz"
);

(async function () {
  const response = await fetch(SOURCE_URL);
  if (!response.ok || !response.body) {
    throw new Error("CC-CEDICT 下载失败：HTTP " + response.status);
  }

  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  await pipeline(Readable.fromWeb(response.body), fs.createWriteStream(targetPath));
  console.log("CC-CEDICT 已下载到 " + targetPath);
})().catch(function (error) {
  console.error(error.message);
  process.exitCode = 1;
});
