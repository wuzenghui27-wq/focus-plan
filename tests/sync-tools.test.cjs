const assert = require("node:assert/strict");
const SyncTools = require("../sync-tools.js");

const source = {
  plans: [{ id: 1, title: "学习 JavaScript" }],
  focusSessions: [{ id: 2, actualSeconds: 1500 }],
  achievementUnlocks: [{ id: "first-focus" }],
  dailyGoalMinutes: 120
};

const snapshot = SyncTools.createSyncSnapshot(
  source,
  "2026-07-28T10:00:00+10:00"
);

assert.equal(snapshot.schemaVersion, 1);
assert.equal(snapshot.updatedAt, "2026-07-28T00:00:00.000Z");
assert.deepEqual(snapshot.data.plans, source.plans);

source.plans[0].title = "已被修改";
assert.equal(snapshot.data.plans[0].title, "学习 JavaScript");

assert.deepEqual(SyncTools.validateSyncSnapshot(snapshot), snapshot);
assert.equal(SyncTools.chooseSyncAction(null, null), "upload");
assert.equal(
  SyncTools.chooseSyncAction(
    "2026-07-28T11:00:00Z",
    "2026-07-28T10:00:00Z"
  ),
  "upload"
);
assert.equal(
  SyncTools.chooseSyncAction(
    "2026-07-28T09:00:00Z",
    "2026-07-28T10:00:00Z"
  ),
  "download"
);
assert.equal(
  SyncTools.chooseSyncAction(
    "2026-07-28T10:00:00Z",
    "2026-07-28T10:00:00Z"
  ),
  "none"
);

assert.throws(
  () => SyncTools.createSyncSnapshot({ ...source, plans: null }, new Date()),
  /plans/
);
assert.throws(
  () => SyncTools.validateSyncSnapshot({ ...snapshot, schemaVersion: 99 }),
  /version/
);

console.log("Sync tools: all tests passed");
