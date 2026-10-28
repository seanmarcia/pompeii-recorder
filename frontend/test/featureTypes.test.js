import assert from "node:assert/strict";
import { test } from "node:test";
import {
  featureTypesFor,
  featureTypeOptionsFor,
  attributesForFeatureType,
  parseFeatureType,
} from "../src/data/featureTypes.js";

// Each 2026 category sheet carries its own "Features and Their Attributes"
// list (issue #27); a blank category offers nothing.
test("a blank category offers no feature types (category first)", () => {
  assert.deepEqual(featureTypeOptionsFor("", "", ""), []);
  assert.deepEqual(featureTypesFor(null), []);
});

test("categories offer their own sheet's feature types, deprecated types excluded", () => {
  const commercial = featureTypeOptionsFor("Commercial", "", "");
  // Standalone on the Commercial/Religion/Public sheets (issue #27).
  assert.ok(commercial.includes("Sculpture (in situ)"));
  // Domestic-only, verbatim from its sheet.
  assert.ok(!commercial.includes("Sculpture, food/drink"));
  // Types on no 2026 sheet are not offered for new entries.
  ["Kiln", "Pipes", "Epitaph", "Ceramic", "Libation Tube", "Couch, dining"].forEach((d) => {
    assert.ok(!commercial.includes(d), `${d} must not be offered`);
  });
  assert.ok(featureTypesFor("Religion").some((t) => t.name === "Altar"));
  assert.ok(!featureTypesFor("Commercial").some((t) => t.name === "Altar"));
});

// The Commercial sheet lists Niche with Couch/Cupboard/Shelf only; the
// Domestic, Religion, and Public sheets add the bench/couch attribute.
test("Niche attributes differ per category sheet", () => {
  assert.deepEqual(attributesForFeatureType("Commercial", "Niche"), [
    "Couch",
    "Cupboard",
    "Shelf",
  ]);
  ["Domestic", "Religion", "Public"].forEach((category) => {
    assert.ok(
      attributesForFeatureType(category, "Niche").includes("Bench, couch"),
      `${category} Niche offers Bench, couch`
    );
  });
  // The Religion sheet's "Crossroad Altar"/"Crossroad Niche" lines.
  assert.deepEqual(attributesForFeatureType("Religion", "Altar"), ["Crossroad"]);
  assert.ok(attributesForFeatureType("Religion", "Niche").includes("Crossroad"));
});

test("the Domestic sheet's couch attributes, including Artificial stream and cascades", () => {
  assert.deepEqual(attributesForFeatureType("Domestic", "Couch"), [
    "Single",
    "Biclinium (masonry)",
    "Semicircular (masonry)",
    "Triclinium (masonry)",
    "Artificial stream and cascades",
  ]);
});

test("attribute sets are per sheet: a type defined with none inherits nothing", () => {
  // The Public sheet prints Platform, cooking with no attributes under it;
  // the Commercial sheet's set must not leak in.
  assert.deepEqual(attributesForFeatureType("Public", "Platform (Cooking)"), []);
  // The Religion sheet is the only one with an Other attribute there.
  assert.ok(attributesForFeatureType("Religion", "Platform (Cooking)").includes("Other"));
  assert.ok(!attributesForFeatureType("Commercial", "Platform (Cooking)").includes("Other"));
  // The Public sheet's flat Altar line carries no Crossroad attribute.
  assert.deepEqual(attributesForFeatureType("Public", "Altar"), []);
});

test("a stored type outside the category list stays selectable", () => {
  // Legacy "Kiln" on a Domestic sheet: appended, not erased.
  assert.deepEqual(featureTypeOptionsFor("Domestic", "Kiln", ""), [
    ...featureTypesFor("Domestic").map((t) => t.name),
    "Kiln",
  ]);
  // A stored type that IS in the list is not duplicated.
  assert.deepEqual(
    featureTypeOptionsFor("Domestic", "Amphora", ""),
    featureTypesFor("Domestic").map((t) => t.name)
  );
});

test("the originally-loaded type stays selectable after the value changes", () => {
  // Load a legacy "Foofing table" sheet, change to Amphora, switch category:
  // the pinned original keeps Foofing table recoverable without a reload.
  const options = featureTypeOptionsFor("Domestic", "Amphora", "Foofing table");
  assert.ok(options.includes("Amphora"));
  assert.ok(options.includes("Foofing table"));
  // Current and original dedupe when they are the same value.
  assert.equal(
    featureTypeOptionsFor("Domestic", "Kiln", "Kiln").filter((n) => n === "Kiln").length,
    1
  );
});

test("legacy types keep their legacy attributes for stored values", () => {
  // Pipes is on no 2026 sheet; its stored value still hydrates its attributes.
  assert.deepEqual(attributesForFeatureType("Domestic", "Pipes", ["Lead"]), [
    "Lead",
    "Terracotta",
  ]);
  // Stored attributes ride along even when the sheet lists different ones.
  assert.deepEqual(attributesForFeatureType("Commercial", "Paintings", ["Relief"]), [
    "Lararium",
    "Wall",
    "Relief",
  ]);
});

test("composite parse round-trips a legacy value", () => {
  assert.deepEqual(parseFeatureType("Counter: Dolium; Hearth"), {
    typeName: "Counter",
    attributes: ["Dolium", "Hearth"],
  });
  assert.deepEqual(parseFeatureType("Amphora"), { typeName: "Amphora", attributes: [] });
});