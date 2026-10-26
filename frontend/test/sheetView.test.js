import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
import { RECORDER_NAMES } from "../src/data/people.js";

let server;
let SheetView;
let BrowseView;
let LandingChoice;
let PhotoUploader;
let FeatureForm;

before(async () => {
  server = await createServer({
    configFile: false,
    cacheDir: "node_modules/.vite-sheet-view-tests",
    server: { middlewareMode: true, hmr: false, watch: null },
  });
  ({ default: SheetView } = await server.ssrLoadModule("/src/components/SheetView.jsx"));
  ({ default: BrowseView } = await server.ssrLoadModule("/src/components/BrowseView.jsx"));
  ({ default: LandingChoice } = await server.ssrLoadModule("/src/components/LandingChoice.jsx"));
  ({ default: PhotoUploader } = await server.ssrLoadModule("/src/components/PhotoUploader.jsx"));
  ({ default: FeatureForm } = await server.ssrLoadModule("/src/components/FeatureForm.jsx"));
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
  assert.match(html, /saved on this device/);
});

test("the landing page offers viewing separately from creating and editing", () => {
  const html = renderToStaticMarkup(React.createElement(LandingChoice));
  assert.match(html, /View an Existing Sheet/);
  assert.match(html, /Start a New Sheet/);
  assert.match(html, /Edit an Existing Sheet/);
});

test("photo selection advertises and accepts PSD alongside HEIC and other image formats", () => {
  const html = renderToStaticMarkup(React.createElement(PhotoUploader, { photos: [] }));
  assert.match(html, /accept="[^"]*\.psd/);
  assert.match(html, /accept="[^"]*\.heic/);
  assert.match(html, /accept="[^"]*image\/vnd\.adobe\.photoshop/);
  assert.match(html, /Photoshop PSD files supported/);
});

test("data entered by offers exactly the same names and order as the recorder dropdown", () => {
  const html = renderToStaticMarkup(React.createElement(FeatureForm, { actionType: "create_new" }));
  const choices = (name) => {
    const select = html.match(new RegExp(`<select[^>]*name="${name}"[^>]*>([\\s\\S]*?)</select>`));
    assert.ok(select, `Missing dropdown: ${name}`);
    return Array.from(select[1].matchAll(/<option value="([^"]+)"/g), (match) => match[1]);
  };
  assert.deepEqual(choices("submitter_name"), RECORDER_NAMES);
  assert.deepEqual(choices("submitter_name"), choices("RECORDER_ID"));
  assert.match(html, /<label for="submitter-name">Your Name \/ Data Entered By<\/label>/);
});

test("category offers only Commercial and Domestic on new sheets, with no usage classification select", () => {
  const html = renderToStaticMarkup(React.createElement(FeatureForm, { actionType: "create_new" }));
  const select = (name) => {
    const match = html.match(new RegExp(`<select[^>]*name="${name}"[^>]*>([\\s\\S]*?)</select>`));
    return match ? match[1] : null;
  };
  const categoryOptions = Array.from(
    (select("CATEGORY_ID") || "").matchAll(/<option value="([^"]+)"/g),
    (m) => m[1]
  );

  assert.deepEqual(categoryOptions, [ "", "Commercial", "Domestic" ]);
  assert.equal(select("USAGE_ID"), null, "Usage Classification select must be gone");
  assert.doesNotMatch(html, /Usage Classification/);
  assert.match(html, /<label>Late Usage<\/label>/, "Late Usage select must remain");
});

test("category keeps a legacy value selectable so an untouched sheet sends no change", () => {
  const feature = {
    SHEET: "6083",
    SHEET_TYPE_ID: "Feature",
    CATEGORY_ID: "Religious",
    USAGE_ID: "Commercial | Bakery: Oven; Enclosed",
  };
  const html = renderToStaticMarkup(
    React.createElement(FeatureForm, { actionType: "update_existing", initialFeature: feature })
  );
  const select = html.match(/<select[^>]*name="CATEGORY_ID"[^>]*>([\s\S]*?)<\/select>/);
  assert.ok(select, "Missing CATEGORY_ID select");
  const options = Array.from(select[1].matchAll(/<option value="([^"]+)"/g), (m) => m[1]);
  assert.deepEqual(options, [ "", "Commercial", "Domestic", "Religious" ]);
  assert.match(select[0], /value="Religious" selected/);
});
