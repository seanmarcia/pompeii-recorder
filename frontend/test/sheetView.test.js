import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

let server;
let SheetView;
let BrowseView;
let LandingChoice;

before(async () => {
  server = await createServer({
    configFile: false,
    cacheDir: "node_modules/.vite-sheet-view-tests",
    server: { middlewareMode: true, hmr: false, watch: null },
  });
  ({ default: SheetView } = await server.ssrLoadModule("/src/components/SheetView.jsx"));
  ({ default: BrowseView } = await server.ssrLoadModule("/src/components/BrowseView.jsx"));
  ({ default: LandingChoice } = await server.ssrLoadModule("/src/components/LandingChoice.jsx"));
});

after(async () => {
  await server?.close();
});

test("sheet viewing renders saved values and filenames without form controls or record mutation", () => {
  const feature = Object.freeze({
    SHEET: "view-123", CATEGORY_ID: "Religious",
    USAGE_ID: "Domestic | Shrine: Niche",
    DESCRIPTION: "<script>not executable</script>",
    photos: Object.freeze(["iphone.jpg"]),
  });
  const html = renderToStaticMarkup(React.createElement(SheetView, { feature }));
  assert.match(html, /Sheet #view-123/);
  assert.match(html, /Read only/);
  assert.match(html, /Religious/);
  assert.match(html, /Domestic \| Shrine: Niche/);
  assert.match(html, /&lt;script&gt;not executable&lt;\/script&gt;/);
  assert.match(html, /iphone\.jpg/);
  assert.doesNotMatch(html, /<(?:input|textarea|select|form)\b/);
  assert.match(html, /Edit \/ Log Updates/);
  assert.equal(feature.CATEGORY_ID, "Religious");
});

test("browse cards expose separate view and edit actions using the cached catalog", () => {
  const html = renderToStaticMarkup(React.createElement(BrowseView, {
    features: [{ SHEET: "123", SPACE_NUMBER: "Shrine" }],
    dataSource: "localStorage", isOnline: false,
  }));
  assert.match(html, /View Sheet/);
  assert.match(html, /Edit \/ Log Updates/);
  assert.match(html, /localStorage/);
});

test("the landing page offers viewing separately from creating and editing", () => {
  const html = renderToStaticMarkup(React.createElement(LandingChoice));
  assert.match(html, /View an Existing Sheet/);
  assert.match(html, /Start a New Sheet/);
  assert.match(html, /Edit an Existing Sheet/);
});
