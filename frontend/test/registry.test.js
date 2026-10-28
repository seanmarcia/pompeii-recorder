import assert from "node:assert/strict";
import { test } from "node:test";
import {
  CATEGORY_BUNDLES,
  bundleFor,
  typeListsFor,
  LEGACY_FEATURE_TYPES,
  LEGACY_SPACE_TYPES,
} from "../src/data/registry.js";

// The data/ layout (issue #42): one module per 2026 category carrying that
// sheet's late-usage, space, and feature lists; a registry composes them and
// the generic option/attribute helpers consume the bundles. The registry is
// the seam a new category touches — one category module plus one registry
// entry.

const KINDS = ["lateUsageTypes", "spaceTypes", "featureTypes"];
const CATEGORY_NAMES = ["Commercial", "Domestic", "Religion", "Public"];

test("the registry resolves the four 2026 categories and nothing else", () => {
  assert.deepEqual(Object.keys(CATEGORY_BUNDLES), CATEGORY_NAMES);
  CATEGORY_NAMES.forEach((category) => {
    assert.ok(bundleFor(category), `${category} resolves to a bundle`);
  });
  // Blank, unset, and legacy master values resolve to no bundle: pick a
  // Category first (same rule the adapters keep).
  assert.equal(bundleFor(""), null);
  assert.equal(bundleFor(null), null);
  assert.equal(bundleFor("Cemetary"), null);
});

test("each category bundle carries all three typed lists, sheet-shaped", () => {
  CATEGORY_NAMES.forEach((category) => {
    KINDS.forEach((kind) => {
      const list = bundleFor(category)[kind];
      assert.ok(Array.isArray(list), `${category}.${kind} is a list`);
      assert.ok(list.length > 0, `${category}.${kind} is not empty`);
      list.forEach((entry) => {
        assert.equal(typeof entry.name, "string", `${category}.${kind} entries have names`);
        assert.ok(Array.isArray(entry.attributes), `${category}.${kind} entries have attribute lists`);
      });
      const names = list.map((t) => t.name);
      assert.equal(new Set(names).size, names.length, `${category}.${kind} names are unique`);
    });
  });
});

test("typeListsFor puts the own category's list first, then the other sheets", () => {
  const religion = typeListsFor("Religion", "featureTypes");
  assert.equal(religion[0], CATEGORY_BUNDLES.Religion.featureTypes);
  assert.deepEqual(
    religion.map((list) => list.length),
    [
      CATEGORY_BUNDLES.Religion.featureTypes.length,
      CATEGORY_BUNDLES.Commercial.featureTypes.length,
      CATEGORY_BUNDLES.Domestic.featureTypes.length,
      CATEGORY_BUNDLES.Public.featureTypes.length,
    ]
  );
  // A blank (or unknown legacy) category has no own list: the other sheets
  // still form the fallback chain the adapters search.
  assert.deepEqual(typeListsFor("", "spaceTypes"), [
    CATEGORY_BUNDLES.Commercial.spaceTypes,
    CATEGORY_BUNDLES.Domestic.spaceTypes,
    CATEGORY_BUNDLES.Religion.spaceTypes,
    CATEGORY_BUNDLES.Public.spaceTypes,
  ]);
});

test("legacy lists stay out of the bundles and the offering chain", () => {
  // Kiln and Pipes exist only on the pre-2026 merged feature list.
  const legacyFeatureNames = LEGACY_FEATURE_TYPES.map((t) => t.name);
  assert.ok(legacyFeatureNames.includes("Kiln"));
  assert.ok(legacyFeatureNames.includes("Pipes"));
  CATEGORY_NAMES.forEach((category) => {
    const names = bundleFor(category).featureTypes.map((t) => t.name);
    ["Kiln", "Pipes"].forEach((legacy) => {
      assert.ok(!names.includes(legacy), `${legacy} is not offered for ${category}`);
    });
  });
  // The bare "Dining" entry (with its merged attribute list) is legacy only;
  // the 2026 sheets split it into atomic options.
  const legacySpaceNames = LEGACY_SPACE_TYPES.map((t) => t.name);
  assert.ok(legacySpaceNames.includes("Dining"));
  CATEGORY_NAMES.forEach((category) => {
    const names = bundleFor(category).spaceTypes.map((t) => t.name);
    assert.ok(!names.includes("Dining"), `bare Dining is not offered for ${category}`);
  });
  // The registry's ordered chains end before legacy: adapters append legacy
  // themselves, and late usage has no legacy list at all.
  typeListsFor("Commercial", "lateUsageTypes").forEach((list) => {
    assert.notEqual(list, LEGACY_SPACE_TYPES);
    assert.notEqual(list, LEGACY_FEATURE_TYPES);
  });
});
