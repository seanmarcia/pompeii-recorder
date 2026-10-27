import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { createServer } from "vite";

// Reference lists from the 2026 category sheets (issue #17):
// Commercial: Agricultural (Olive Grove/Orchard/Vineyard/Other), Bakery,
//   Hotel/Inn, Market Building (Cattle/Vegetable), Food Distribution Center,
//   Drink Distribution Center, Food & Drink Shop (Small/Large/Food
//   processing/Other), Restaurant, Shop-House, Space for Public Eating and
//   Drinking, Storage, Thermopolium, Warehouse/Granary, Other.
// Domestic (flat, no attributes): Apartment, Farm House, House, House-Shop,
//   Space - Public Eating and Drinking, Villa rustica, Villa Urbana, Other.
const COMMERCIAL = [
  "Agricultural",
  "Bakery",
  "Hotel/Inn",
  "Market Building",
  "Food Distribution Center",
  "Drink Distribution Center",
  "Food & Drink Shop",
  "Restaurant",
  "Shop-House",
  "Space for Public Eating and Drinking",
  "Storage",
  "Thermopolium",
  "Warehouse/Granary",
  "Other",
];

const DOMESTIC = [
  "Apartment",
  "Farm House",
  "House",
  "House-Shop",
  "Space - Public Eating and Drinking",
  "Villa rustica",
  "Villa Urbana",
  "Other",
];

// Deprecated types: on the current merged list, on neither 2026 sheet.
const DEPRECATED = ["Amphitheater", "Basilica", "Gladiatorial barracks", "Temple", "Theater", "Tomb"];

let server;
let lateUsage;

before(async () => {
  server = await createServer({
    configFile: false,
    cacheDir: "node_modules/.vite-late-usage-tests",
    server: { middlewareMode: true, hmr: false, watch: null },
  });
  lateUsage = await server.ssrLoadModule("/src/data/lateUsage.js");
});

after(async () => {
  await server?.close();
});

test("commercial sheets offer the 2026 commercial list, deprecated types excluded", () => {
  const options = lateUsage.lateUsageOptionsFor("Commercial", "");
  assert.deepEqual(options, COMMERCIAL);
  DEPRECATED.forEach((d) => assert.ok(!options.includes(d), `${d} must not be offered`));
  assert.ok(options.includes("Thermopolium"), "Thermopolium is a commercial type");
});

test("domestic sheets offer the 2026 domestic list, deprecated types excluded", () => {
  const options = lateUsage.lateUsageOptionsFor("Domestic", "");
  assert.deepEqual(options, DOMESTIC);
  DEPRECATED.forEach((d) => assert.ok(!options.includes(d), `${d} must not be offered`));
  assert.ok(!options.includes("Thermopolium"), "Thermopolium is commercial only");
});

test("a blank category offers no late usage types (category first)", () => {
  assert.deepEqual(lateUsage.lateUsageOptionsFor("", ""), []);
  assert.deepEqual(lateUsage.lateUsageOptionsFor(null, ""), []);
});

test("a stored type outside the category list stays selectable (categoryOptionsFor pattern)", () => {
  // Legacy "Tomb" on a Domestic sheet: appended, not erased.
  const options = lateUsage.lateUsageOptionsFor("Domestic", "Tomb");
  assert.deepEqual(options, [...DOMESTIC, "Tomb"]);
  // A stored type that IS in the list is not duplicated.
  assert.deepEqual(lateUsage.lateUsageOptionsFor("Domestic", "House"), DOMESTIC);
});

test("attributes follow the category list and union with stored attributes", () => {
  assert.deepEqual(lateUsage.attributesForLateUsageType("Commercial", "Agricultural"), [
    "Olive Grove",
    "Orchard",
    "Vineyard",
    "Other",
  ]);
  assert.deepEqual(lateUsage.attributesForLateUsageType("Commercial", "Market Building"), [
    "Cattle",
    "Vegetable",
  ]);
  // Domestic is flat: no attributes for any domestic type.
  DOMESTIC.filter((t) => t !== "Other").forEach((t) => {
    assert.deepEqual(lateUsage.attributesForLateUsageType("Domestic", t), [], `${t} has no attributes`);
  });
  // A stored type outside the category list keeps its stored attributes unioned in.
  assert.deepEqual(
    lateUsage.attributesForLateUsageType("Domestic", "Agricultural", ["Orchard", "Piscina"]),
    ["Olive Grove", "Orchard", "Vineyard", "Other", "Piscina"]
  );
  // Storage has no sub-categories on the 2026 commercial sheet.
  assert.deepEqual(lateUsage.attributesForLateUsageType("Commercial", "Storage"), []);
});