const SYNC_SCHEMA_VERSION = 1;
const SYNC_METADATA_STORAGE_KEY = "focus-plan-sync-metadata";

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

function createSyncMetadata(accountId) {
  return {
    accountId: accountId ?? null,
    localUpdatedAt: null,
    lastSyncedLocalUpdatedAt: null,
    lastSyncedRemoteUpdatedAt: null
  };
}

function normalizeSyncMetadata(value) {
  const metadata = createSyncMetadata(value?.accountId);

  [
    "localUpdatedAt",
    "lastSyncedLocalUpdatedAt",
    "lastSyncedRemoteUpdatedAt"
  ].forEach(function (key) {
    if (value?.[key] && !Number.isNaN(new Date(value[key]).getTime())) {
      metadata[key] = new Date(value[key]).toISOString();
    }
  });

  return metadata;
}

function loadSyncMetadata(storage) {
  try {
    return normalizeSyncMetadata(
      JSON.parse(storage.getItem(SYNC_METADATA_STORAGE_KEY) || "null")
    );
  } catch (error) {
    return createSyncMetadata(null);
  }
}

function saveSyncMetadata(storage, metadata) {
  storage.setItem(
    SYNC_METADATA_STORAGE_KEY,
    JSON.stringify(normalizeSyncMetadata(metadata))
  );
}

function decideSyncAction(metadata, remoteUpdatedAt) {
  const normalized = normalizeSyncMetadata(metadata);
  const hasLocalChanges =
    normalized.localUpdatedAt !== normalized.lastSyncedLocalUpdatedAt;

  if (!remoteUpdatedAt) {
    return "upload";
  }

  const normalizedRemote = normalizeUpdatedAt(remoteUpdatedAt);
  const remoteChanged =
    normalizedRemote !== normalized.lastSyncedRemoteUpdatedAt;

  if (remoteChanged && hasLocalChanges) {
    return "conflict";
  }

  if (remoteChanged) {
    return "download";
  }

  return hasLocalChanges ? "upload" : "none";
}


export {
  SYNC_SCHEMA_VERSION,
  SYNC_METADATA_STORAGE_KEY,
  createSyncSnapshot,
  validateSyncSnapshot,
  chooseSyncAction,
  createSyncMetadata,
  normalizeSyncMetadata,
  loadSyncMetadata,
  saveSyncMetadata,
  decideSyncAction
};
