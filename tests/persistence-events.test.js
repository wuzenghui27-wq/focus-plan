import assert from "node:assert/strict";
import { createPersistenceEvents } from "../src/client/core/persistence-events.js";

const calls = [];
const events = createPersistenceEvents();
events.configure({
  onDataChanged: function () {
    calls.push("data");
  },
  onPlansSaved: function () {
    calls.push("plans");
  },
  onStorageError: function () {
    calls.push("error");
  }
});

events.notifyDataChanged();
events.notifyPlansSaved();
events.notifyStorageError();

assert.deepEqual(calls, ["data", "plans", "error"]);
console.log("Persistence events: all tests passed");
