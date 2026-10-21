import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { runInNewContext } from "node:vm";

const source = readFileSync(new URL("../src/sw-template.js", import.meta.url), "utf8")
  .replace("__CACHE_VERSION__", "test")
  .replace("__PRECACHE_FILES__", "[]");

test("cached decoder modules work offline despite Vary: Origin response headers", async () => {
  const listeners = {};
  const cachedResponse = { body: "cached HEIC decoder" };
  let networkRequests = 0;
  runInNewContext(source, {
    URL,
    self: {
      registration: { scope: "http://localhost:4173/pompeii-recorder/" },
      addEventListener: (type, callback) => { listeners[type] = callback; },
    },
    caches: {
      match: async (_request, options) => options?.ignoreVary ? cachedResponse : undefined,
    },
    fetch: () => {
      networkRequests++;
      throw new Error("Network is offline");
    },
  });
  let response;
  listeners.fetch({
    request: {
      method: "GET", mode: "cors",
      url: "http://localhost:4173/pompeii-recorder/field-assets/heic-to.js",
    },
    respondWith: (value) => { response = value; },
  });
  assert.equal(await response, cachedResponse);
  assert.equal(networkRequests, 0);
});

test("the offline cache still excludes backend routes, other origins, and writes", () => {
  const listeners = {};
  runInNewContext(source, {
    URL,
    self: {
      registration: { scope: "https://example.org/" },
      addEventListener: (type, callback) => { listeners[type] = callback; },
    },
  });
  for (const [url, method] of [
    ["https://example.org/api/v1/features", "GET"],
    ["https://example.org/admin", "GET"],
    ["https://example.org/up", "GET"],
    ["https://other.example.org/photo.jpg", "GET"],
    ["https://example.org/submission", "POST"],
  ]) {
    listeners.fetch({
      request: { url, method },
      respondWith: () => assert.fail("An online-only request was intercepted"),
    });
  }
});
