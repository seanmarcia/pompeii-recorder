import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { createServer } from "vite";

let server;
let usageField;

before(async () => {
  server = await createServer({
    configFile: false,
    cacheDir: "node_modules/.vite-usage-field-tests",
    server: { middlewareMode: true, hmr: false, watch: null },
  });
  usageField = await server.ssrLoadModule("/src/data/usageField.js");
});

after(async () => {
  await server?.close();
});

test("usage classification list matches the restricted category list", () => {
  assert.deepEqual(usageField.USAGE_CLASSIFICATIONS, [ "Commercial", "Domestic", "Religion", "Public" ]);
});

test("formatting preserves a parsed classification so legacy edits keep their prefix", () => {
  const parsed = usageField.parseUsageField("Commercial | Bakery: Oven; Enclosed");

  assert.equal(parsed.usageClassification, "Commercial");
  assert.equal(parsed.lateUsageTypeName, "Bakery");
  assert.deepEqual(parsed.lateUsageAttributes, [ "Oven", "Enclosed" ]);

  // Rebuilding after a Late Usage change keeps the classification half.
  assert.equal(
    usageField.formatUsageField(parsed.usageClassification, "Bakery", [ "Oven" ]),
    "Commercial | Bakery: Oven"
  );
});

test("a new sheet without a classification stores only the late usage half", () => {
  const parsed = usageField.parseUsageField("Bakery: Oven");
  assert.equal(parsed.usageClassification, "");
  assert.equal(usageField.formatUsageField(parsed.usageClassification, "Bakery", [ "Oven" ]), "Bakery: Oven");
});