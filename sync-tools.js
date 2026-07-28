(function (root, factory) {
  const tools = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = tools;
  }

  root.SyncTools = tools;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const SYNC_SCHEMA_VERSION = 1;

  function cloneJsonValue(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function assertArray(value, label) {
    if (!Array.isArray(value)) {
      throw new TypeError(label + " must be an array.");
    }
  }

  function normalizeUpdatedAt(value) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      throw new TypeError("updatedAt must be a valid date.");
    }

    return date.toISOString();
  }

  function createSyncSnapshot(data, updatedAt) {
    assertArray(data.plans, "plans");
    assertArray(data.focusSessions, "focusSessions");
    assertArray(data.achievementUnlocks, "achievementUnlocks");

    const dailyGoalMinutes = Number(data.dailyGoalMinutes);

    if (!Number.isInteger(dailyGoalMinutes) || dailyGoalMinutes <= 0) {
      throw new TypeError("dailyGoalMinutes must be a positive integer.");
    }

    return {
      schemaVersion: SYNC_SCHEMA_VERSION,
      updatedAt: normalizeUpdatedAt(updatedAt),
      data: cloneJsonValue({
        plans: data.plans,
        focusSessions: data.focusSessions,
        achievementUnlocks: data.achievementUnlocks,
        dailyGoalMinutes
      })
    };
  }

  function validateSyncSnapshot(snapshot) {
    if (
      snapshot === null ||
      typeof snapshot !== "object" ||
      Array.isArray(snapshot)
    ) {
      throw new TypeError("Sync snapshot must be an object.");
    }

    if (snapshot.schemaVersion !== SYNC_SCHEMA_VERSION) {
      throw new TypeError("Unsupported sync schema version.");
    }

    return createSyncSnapshot(snapshot.data, snapshot.updatedAt);
  }

  function chooseSyncAction(localUpdatedAt, remoteUpdatedAt) {
    if (!remoteUpdatedAt) {
      return "upload";
    }

    if (!localUpdatedAt) {
      return "download";
    }

    const localTime = new Date(localUpdatedAt).getTime();
    const remoteTime = new Date(remoteUpdatedAt).getTime();

    if (!Number.isFinite(localTime) || !Number.isFinite(remoteTime)) {
      throw new TypeError("Sync timestamps must be valid dates.");
    }

    if (localTime === remoteTime) {
      return "none";
    }

    return localTime > remoteTime ? "upload" : "download";
  }

  return {
    SYNC_SCHEMA_VERSION,
    createSyncSnapshot,
    validateSyncSnapshot,
    chooseSyncAction
  };
});
