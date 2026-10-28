import assert from "node:assert/strict";
import { test } from "node:test";
import {
  spaceTypesFor,
  spaceTypeOptionsFor,
  attributesForSpaceType,
  parseSpaceType,
} from "../src/data/spaceTypes.js";

// Each 2026 category sheet carries its own "Rooms and Spaces" list (issue
// #27); a blank category offers nothing.
test("a blank category offers no space types (category first)", () => {
  assert.deepEqual(spaceTypeOptionsFor("", "", ""), []);
  assert.deepEqual(spaceTypesFor(null), []);
});

test("categories offer their own sheet's space types, deprecated types excluded", () => {
  const commercial = spaceTypeOptionsFor("Commercial", "", "");
  // Printed under Rooms and Spaces on the Commercial sheet.
  assert.ok(commercial.includes("Rack"));
  assert.ok(commercial.includes("Tablinum"));
  assert.ok(!commercial.includes("Diaeta"));
  assert.ok(!commercial.includes("Ambulatory"));
  // Types on no 2026 sheet are not offered for new entries.
  ["Burial chamber", "Colombarium", "Exterior space", "Lobby", "Porch"].forEach((d) => {
    assert.ok(!commercial.includes(d), `${d} must not be offered`);
  });
  // Domestic-only rooms.
  const domestic = spaceTypesFor("Domestic").map((t) => t.name);
  assert.ok(domestic.includes("Diaeta"));
  assert.ok(domestic.includes("Ambulatory"));
  assert.ok(domestic.includes("Granary"));
  // The sheet's banquet lines, verbatim.
  assert.ok(domestic.includes("Space - Communal Banqueting"));
  assert.ok(domestic.includes("Space - Public Banquets"));
  // Religion's epulum line and cooking/altar spaces.
  const religion = spaceTypesFor("Religion").map((t) => t.name);
  assert.ok(religion.includes("Banquet Space (Epulum)"));
  assert.ok(religion.includes("Space for Public Banquets"));
  assert.ok(religion.includes("Space around altars"));
  assert.ok(religion.includes("Space for cooking"));
  // Religion prints "Dining Garden" without /Peristyle.
  assert.deepEqual(attributesForSpaceType("Religion", "Dining"), [
    "Garden",
    "Hall",
    "Room",
    "Second Floor",
    "Tablinum",
    "Other",
  ]);
});

test("the dining variants are modeled as Dining attributes, per sheet", () => {
  assert.deepEqual(attributesForSpaceType("Commercial", "Dining"), [
    "Garden / Peristyle",
    "Hall",
    "Room",
    "Second Floor",
    "Other",
  ]);
  assert.deepEqual(attributesForSpaceType("Public", "Dining"), [
    "Other",
    "Garden / Peristyle",
    "Hall",
    "Room",
    "Second Floor",
  ]);
});

test("a stored type outside the category list stays selectable", () => {
  // Legacy "Burial chamber" on a Domestic sheet: appended, not erased.
  assert.deepEqual(spaceTypeOptionsFor("Domestic", "Burial chamber", ""), [
    ...spaceTypesFor("Domestic").map((t) => t.name),
    "Burial chamber",
  ]);
  // A stored type that IS in the list is not duplicated.
  assert.deepEqual(
    spaceTypeOptionsFor("Domestic", "Atrium", ""),
    spaceTypesFor("Domestic").map((t) => t.name)
  );
});

test("the originally-loaded type stays selectable after the value changes", () => {
  const options = spaceTypeOptionsFor("Public", "Atrium", "Lobby");
  assert.ok(options.includes("Atrium"));
  assert.ok(options.includes("Lobby"));
});

test("legacy types keep their legacy attributes for stored values", () => {
  // "Exterior space" is on no 2026 sheet: the legacy set hydrates it.
  assert.deepEqual(attributesForSpaceType("Public", "Exterior space"), [
    "Walled",
    "Open",
    "Street",
    "Sidewalk",
  ]);
  // The sheets print "Other" with no attributes; stored attributes from a
  // legacy value still ride along through the union.
  assert.deepEqual(attributesForSpaceType("Domestic", "Other", ["Ala", "Cubiculum"]), [
    "Ala",
    "Cubiculum",
  ]);
});

test("composite parse round-trips a legacy value", () => {
  assert.deepEqual(parseSpaceType("Dining: Hall; Room"), {
    typeName: "Dining",
    attributes: ["Hall", "Room"],
  });
  assert.deepEqual(parseSpaceType("Atrium"), { typeName: "Atrium", attributes: [] });
});