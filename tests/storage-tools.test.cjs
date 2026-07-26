const assert = require("assert");
const {
  loadJsonArray,
  saveJson
} = require("../storage-tools.js");

function createStorage(initialValues) {
  const values = new Map(Object.entries(initialValues || {}));

  return {
    getItem: function (key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem: function (key, value) {
      values.set(key, value);
    },
    removeItem: function (key) {
      values.delete(key);
    },
    has: function (key) {
      return values.has(key);
    }
  };
}

const emptyStorage = createStorage();
assert.deepStrictEqual(loadJsonArray(emptyStorage, "items"), {
  items: [],
  recovered: false,
  error: null
});

const validStorage = createStorage({
  items: JSON.stringify([{ id: 1 }, { id: 2 }])
});
const validResult = loadJsonArray(
  validStorage,
  "items",
  function (items) {
    return items.filter(function (item) {
      return item.id === 2;
    });
  }
);
assert.deepStrictEqual(validResult.items, [{ id: 2 }]);
assert.strictEqual(validResult.recovered, false);

const corruptStorage = createStorage({ items: "{not valid json" });
const corruptResult = loadJsonArray(corruptStorage, "items");
assert.deepStrictEqual(corruptResult.items, []);
assert.strictEqual(corruptResult.recovered, true);
assert.strictEqual(corruptStorage.has("items"), false);

const wrongShapeStorage = createStorage({
  items: JSON.stringify({ id: 1 })
});
const wrongShapeResult = loadJsonArray(wrongShapeStorage, "items");
assert.strictEqual(wrongShapeResult.recovered, true);
assert.strictEqual(wrongShapeStorage.has("items"), false);

const normalizerFailureStorage = createStorage({
  items: JSON.stringify([{ id: 1 }])
});
const normalizerFailureResult = loadJsonArray(
  normalizerFailureStorage,
  "items",
  function () {
    throw new Error("Normalization failed.");
  }
);
assert.strictEqual(normalizerFailureResult.recovered, true);
assert.strictEqual(normalizerFailureStorage.has("items"), false);

const writableStorage = createStorage();
assert.strictEqual(
  saveJson(writableStorage, "items", [{ id: 3 }]).ok,
  true
);
assert.deepStrictEqual(
  loadJsonArray(writableStorage, "items").items,
  [{ id: 3 }]
);

const fullStorage = {
  setItem: function () {
    throw new Error("Quota exceeded.");
  }
};
const failedSave = saveJson(fullStorage, "items", []);
assert.strictEqual(failedSave.ok, false);
assert.match(failedSave.error.message, /Quota exceeded/);

console.log("Storage tools: all tests passed");
