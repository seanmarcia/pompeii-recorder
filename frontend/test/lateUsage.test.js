import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { createServer } from "vite";

// Reference lists from the 2026 category sheets (issues #17 and #27):
// Commercial: Agricultural (Olive Grove/Orchard/Vineyard/Other), Bakery,
//   Hotel/Inn, Market Building (Cattle/Vegetable), Food Distribution Center,
//   Drink Distribution Center, Food & Drink Shop (Small/Large/Food
//   processing/Other), Restaurant, Shop-House, Space for Public Eating and
//   Drinking, Storage, Thermopolium, Warehouse/Granary, Other.
// Domestic (flat): Apartment, Farm House, House, House-Shop, Space - Public
//   Eating and Drinking, Villa rustica, Villa Urbana, Other.
// Religion: Association Structure, Crossroad Shrine, Shop, Storage,
//   Space - Public Eating and Drinking, Temple (attribute: Temple Shop),
//   Other.
// Public (flat, spellings as printed on the sheet): Amphitheater, Basilica,
//   Bath, Civic Building-Archives, Colonnade-forum, paving stones, Fountain,
//   public, Gate, Gladiatorial Barracks, Gymnasium, Market Building, Market,
//   Cattle, Market, Vegetable, Space-Public Eating and Drinking, Storage
//   (Cool storage chamber), Table for Weights and Measures, Theater, Small,
//   Theatre, Large, Water Reservoir, Water Distribution Center, Water
//   Storage, Water Tower.
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

const RELIGION = [
  "Association Structure",
  "Crossroad Shrine",
  "Shop",
  "Storage",
  "Space - Public Eating and Drinking",
  "Temple",
  "Other",
];

const PUBLIC = [
  "Amphitheater",
  "Basilica",
  "Bath",
  "Civic Building-Archives",
  "Colonnade-forum",
  "paving stones",
  "Fountain, public",
  "Gate",
  "Gladiatorial Barracks",
  "Gymnasium",
  "Market Building",
  "Market, Cattle",
  "Market, Vegetable",
  "Space-Public Eating and Drinking",
  "Storage (Cool storage chamber)",
  "Table for Weights and Measures",
  "Theater, Small",
  "Theatre, Large",
  "Water Reservoir",
  "Water Distribution Center",
  "Water Storage",
  "Water Tower",
];

// Deprecated types: on the old merged list, on no 2026 sheet. The Religion and
// Public sheets made Amphitheater, Basilica, Gladiatorial barracks, and Temple
// reachable again through their own categories.
const DEPRECATED = ["Theater", "Tomb", "Street shrine"];

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

test("religion sheets offer the 2026 religion list, deprecated types excluded", () => {
  const options = lateUsage.lateUsageOptionsFor("Religion", "");
  assert.deepEqual(options, RELIGION);
  DEPRECATED.forEach((d) => assert.ok(!options.includes(d), `${d} must not be offered`));
  // The sheet prints "Temple Shop" indented under Temple: an attribute,
  // not a sibling type.
  assert.deepEqual(lateUsage.attributesForLateUsageType("Religion", "Temple"), ["Temple Shop"]);
});

test("public sheets offer the 2026 public list, deprecated types excluded", () => {
  const options = lateUsage.lateUsageOptionsFor("Public", "");
  assert.deepEqual(options, PUBLIC);
  DEPRECATED.forEach((d) => assert.ok(!options.includes(d), `${d} must not be offered`));
  // Types stranded when only Commercial/Domestic had lists are reachable
  // again through the Public sheet.
  ["Amphitheater", "Basilica", "Gladiatorial Barracks", "Gymnasium"].forEach((t) => {
    assert.ok(options.includes(t), `${t} is a public type`);
  });
});

test("a blank category offers no late usage types (category first)", () => {
  assert.deepEqual(lateUsage.lateUsageOptionsFor("", ""), []);
  assert.deepEqual(lateUsage.lateUsageOptionsFor(null, ""), []);
});

test("a stored type outside the category list stays selectable (categoryOptionsFor pattern)", () => {
  // Legacy "Tomb" on a Domestic sheet: appended, not erased.
  const options = lateUsage.lateUsageOptionsFor("Domestic", "Tomb");
  assert.deepEqual(options, [...DOMESTIC, "Tomb"]);
  // Legacy "Sanctuary" on a Religion sheet: appended, not erased.
  assert.deepEqual(lateUsage.lateUsageOptionsFor("Religion", "Sanctuary"), [...RELIGION, "Sanctuary"]);
  // A stored type that IS in the list is not duplicated.
  assert.deepEqual(lateUsage.lateUsageOptionsFor("Religion", "Temple"), RELIGION);
});

test("the originally-loaded type stays selectable after the value or category changes", () => {
  // Load a legacy "Foofery" sheet, pick Apartment, correct the category:
  // both the current pick and the pinned original stay in the list, so the
  // accidental change is undone by re-picking instead of reloading.
  const options = lateUsage.lateUsageOptionsFor("Domestic", "Apartment", "Foofery");
  assert.ok(options.includes("Apartment"));
  assert.ok(options.includes("Foofery"));
  // Current and original dedupe when they are the same value.
  assert.deepEqual(
    lateUsage.lateUsageOptionsFor("Domestic", "Tomb", "Tomb"),
    [...DOMESTIC, "Tomb"]
  );
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

test("the public list is flat: no type carries attributes", () => {
  PUBLIC.forEach((t) => {
    assert.deepEqual(lateUsage.attributesForLateUsageType("Public", t), [], `${t} has no attributes`);
  });
});

test("a type shared across sheets uses its own category's attribute list", () => {
  // Market Building carries attributes on the Commercial sheet; the Public
  // sheet lists it flat.
  assert.deepEqual(lateUsage.attributesForLateUsageType("Public", "Market Building"), []);
  assert.deepEqual(lateUsage.attributesForLateUsageType("Commercial", "Market Building"), [
    "Cattle",
    "Vegetable",
  ]);
});

test("legacy public and religion values keep stored attributes selectable", () => {
  // The old merged list modeled the colonnade entry with Forum and Paving
  // stones attributes; a stored value keeps them changeable.
  assert.deepEqual(
    lateUsage.attributesForLateUsageType("Public", "Colonnade (Arcade)", ["Forum", "Paving stones"]),
    ["Forum", "Paving stones"]
  );
});
