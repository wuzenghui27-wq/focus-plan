const assert = require("node:assert/strict");
const { createAccountStore } = require("../server/account-store.cjs");

const store = createAccountStore(":memory:");
store.savePhoneCode("13800138000", "code-hash", 2000);
assert.equal(store.consumePhoneCode("13800138000", "wrong", 1000), false);
assert.equal(store.consumePhoneCode("13800138000", "code-hash", 1000), true);
assert.equal(store.consumePhoneCode("13800138000", "code-hash", 1000), false);

const user = store.getOrCreateUser("13800138000", "2026-07-28T00:00:00Z");
assert.equal(
  store.getOrCreateUser("13800138000", "2026-07-29T00:00:00Z").id,
  user.id
);
store.createSession("token-hash", user.id, 2000);
assert.equal(store.getUserBySession("token-hash", 1000).phone, "13800138000");
assert.equal(store.getUserBySession("token-hash", 3000), null);

const snapshot = {
  schemaVersion: 1,
  updatedAt: "2026-07-28T00:00:00Z",
  data: {
    plans: [],
    focusSessions: [],
    achievementUnlocks: [],
    dailyGoalMinutes: 120
  }
};
store.saveSnapshot(user.id, snapshot);
assert.deepEqual(store.getSnapshot(user.id), snapshot);
store.close();
console.log("Account store: all tests passed");
