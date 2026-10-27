import assert from "node:assert/strict";
import { test } from "node:test";
import { FEATURE_TYPES, attributesForFeatureType } from "../src/data/featureTypes.js";

// The 2026 Religion and Public category sheets list Sculpture (in situ) as a
// standalone feature and give Platform, cooking an Other attribute; the
// merged list folds both in (issue #27).
test("category-sheet feature gaps are folded into the merged list", () => {
  assert.ok(
    FEATURE_TYPES.some((f) => f.name === "Sculpture (in situ)"),
    "Sculpture (in situ) is a standalone feature choice"
  );
  assert.deepEqual(attributesForFeatureType("Platform (Cooking)"), [
    "Front lip",
    "Grill",
    "Hearth",
    "Rear shelf",
    "Recessed storage",
    "Roasting pit",
    "Window",
    "Tiled surface",
    "Stepped shelf",
    "Other",
  ]);
});
