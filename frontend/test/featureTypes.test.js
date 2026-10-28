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

// Niche attributes are exactly what each sheet prints, casing included:
// the Commercial sheet lists Couch/Cupboard/Shelf; the Domestic sheet prints
// the bench/couch line lowercase; Religion uses a slash; Public capitalizes.
test("Niche attributes differ per category sheet, casing kept as printed", () => {
  assert.deepEqual(attributesForFeatureType("Commercial", "Niche"), [
    "Couch",
    "Cupboard",
    "Shelf",
  ]);
  assert.deepEqual(attributesForFeatureType("Domestic", "Niche"), [
    "bench, couch",
    "cupboard",
    "shelf",
  ]);
  assert.deepEqual(attributesForFeatureType("Religion", "Niche"), ["bench/couch", "Crossroad"]);
  assert.deepEqual(attributesForFeatureType("Public", "Niche"), [
    "Bench, Couch",
    "Cupboard",
    "Shelf",
  ]);
  // The Religion sheet's "Crossroad Altar"/"Crossroad Niche" lines.
  assert.deepEqual(attributesForFeatureType("Religion", "Altar"), ["Crossroad"]);
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
  // The Public sheet's flat Altar line carries no Crossroad attribute, and
  // the empty set must not inherit the Religion sheet's.
  assert.deepEqual(attributesForFeatureType("Public", "Altar"), []);
  // Platform (Cooking): Commercial and Domestic print nine attributes with
  // no Other; Religion and Public (per Lisa) include Other.
  ["Commercial", "Domestic"].forEach((category) => {
    const attributes = attributesForFeatureType(category, "Platform (Cooking)");
    assert.ok(!attributes.includes("Other"), `${category} Platform has no Other`);
    assert.equal(attributes.length, 9);
  });
  ["Religion", "Public"].forEach((category) => {
    assert.ok(attributesForFeatureType(category, "Platform (Cooking)").includes("Other"));
  });
});

test("sheet-verbatim names replace the merged list's names where called out", () => {
  // The Domestic sheet prints "Kitchen equipment in situ"; Commercial and
  // Religion print "Kitchen equipment".
  assert.ok(featureTypesFor("Domestic").some((t) => t.name === "Kitchen equipment in situ"));
  assert.ok(!featureTypesFor("Domestic").some((t) => t.name === "Kitchen equipment"));
  ["Commercial", "Religion"].forEach((category) => {
    assert.ok(featureTypesFor(category).some((t) => t.name === "Kitchen equipment"));
  });
  // "Masonry support (wooden platform)" as printed on Commercial/Domestic.
  ["Commercial", "Domestic"].forEach((category) => {
    assert.ok(
      featureTypesFor(category).some((t) => t.name === "Masonry support (wooden platform)")
    );
    assert.ok(!featureTypesFor(category).some((t) => t.name === "Masonry Platform Supports"));
  });
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