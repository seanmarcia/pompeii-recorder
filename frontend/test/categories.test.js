import assert from "node:assert/strict";
import { test } from "node:test";
import { CATEGORY_OPTIONS, categoryOptionsFor } from "../src/data/categories.js";

test("category list is restricted to Commercial and Domestic", () => {
  assert.deepEqual(CATEGORY_OPTIONS, [ "Commercial", "Domestic" ]);
});

test("new sheets and in-list values get only the restricted choices", () => {
  assert.deepEqual(categoryOptionsFor(undefined), [ "", "Commercial", "Domestic" ]);
  assert.deepEqual(categoryOptionsFor(""), [ "", "Commercial", "Domestic" ]);
  assert.deepEqual(categoryOptionsFor("Domestic"), [ "", "Commercial", "Domestic" ]);
});

test("legacy values stay selectable so an untouched sheet keeps its value", () => {
  assert.deepEqual(categoryOptionsFor("Religious"), [ "", "Commercial", "Domestic", "Religious" ]);
  assert.deepEqual(categoryOptionsFor("Public"), [ "", "Commercial", "Domestic", "Public" ]);
});