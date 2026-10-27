import assert from "node:assert/strict";
import { test } from "node:test";
import { CATEGORY_OPTIONS, categoryOptionsFor } from "../src/data/categories.js";

test("category list is restricted to the four 2026 category-sheet choices", () => {
  assert.deepEqual(CATEGORY_OPTIONS, [ "Commercial", "Domestic", "Religion", "Public" ]);
});

test("new sheets and in-list values get only the restricted choices", () => {
  assert.deepEqual(categoryOptionsFor(undefined), [ "", "Commercial", "Domestic", "Religion", "Public" ]);
  assert.deepEqual(categoryOptionsFor(""), [ "", "Commercial", "Domestic", "Religion", "Public" ]);
  assert.deepEqual(categoryOptionsFor("Religion"), [ "", "Commercial", "Domestic", "Religion", "Public" ]);
  assert.deepEqual(categoryOptionsFor("Public"), [ "", "Commercial", "Domestic", "Religion", "Public" ]);
});

test("legacy values stay selectable so an untouched sheet keeps its value", () => {
  // Real legacy master values, from the imported features.json data.
  assert.deepEqual(categoryOptionsFor("Cemetary"), [ "", "Commercial", "Domestic", "Religion", "Public", "Cemetary" ]);
  assert.deepEqual(
    categoryOptionsFor("Domestic/commercial"),
    [ "", "Commercial", "Domestic", "Religion", "Public", "Domestic/commercial" ]
  );
});
