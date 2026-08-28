import assert from "node:assert/strict";
import { createApiHandler } from "../src/server/http/api-handler.js";

function createResponse() {
  return {
    status: null,
    headers: null,
    body: "",
    writeHead: function (status, headers) {
      this.status = status;
      this.headers = headers;
    },
    end: function (body = "") {
      this.body = body;
    }
  };
}

const handler = createApiHandler({
  store: {},
  pushService: null,
  dictionaryService: {
    isConfigured: function () {
      return true;
    },
    lookup: async function (query) {
      return { query, headword: query };
    }
  }
});

const dictionaryResponse = createResponse();
const dictionaryHandled = await handler(
  { method: "GET" },
  dictionaryResponse,
  new URL("http://127.0.0.1/api/dictionary?q=apple")
);
assert.equal(dictionaryHandled, true);
assert.equal(dictionaryResponse.status, 200);
assert.equal(JSON.parse(dictionaryResponse.body).result.headword, "apple");

const unknownResponse = createResponse();
const unknownHandled = await handler(
  { method: "GET" },
  unknownResponse,
  new URL("http://127.0.0.1/api/unknown")
);
assert.equal(unknownHandled, false);
assert.equal(unknownResponse.status, null);

console.log("API routing: all tests passed");
