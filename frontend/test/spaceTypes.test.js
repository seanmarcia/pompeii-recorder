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
  // Sheet-verbatim names the team called out.
  assert.ok(commercial.includes("Space for Portable Carts"));
  assert.ok(commercial.includes("Space for Food Stall"));
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
  assert.ok(religion.includes("Public Banquet Space (Epulum)"));
  assert.ok(religion.includes("Space for Public Banquets"));
  assert.ok(religion.includes("Space around altars"));
  assert.ok(religion.includes("Space for cooking"));
  // The Religion sheet prints "Dining Garden" without /Peristyle.
  assert.ok(religion.includes("Dining Garden"));
  // The Public sheet prints the singular banquet line.
  assert.ok(spaceTypesFor("Public").some((t) => t.name === "Space for Public Banquet"));
});

test("the dining variants are atomic options, one per sheet line", () => {
  // No Dining-with-attributes type is offered for new entries.
  ["Commercial", "Domestic", "Religion", "Public"].forEach((category) => {
    assert.ok(
      !spaceTypesFor(category).some((t) => t.name === "Dining"),
      `${category} has no Dining parent type`
    );
  });
  const commercial = spaceTypesFor("Commercial").map((t) => t.name);
  ["Dining Garden/Peristyle", "Dining Hall", "Dining Room", "Dining Second Floor", "Dining, Other"].forEach(
    (name) => assert.ok(commercial.includes(name), `Commercial offers ${name}`)
  );
  // The Religion sheet's atomic "Dining Garden".
  const religion = spaceTypesFor("Religion").map((t) => t.name);
  ["Dining Garden", "Dining Hall", "Dining Room", "Dining Second Floor", "Dining Tablinum", "Dining, Other"].forEach(
    (name) => assert.ok(religion.includes(name), `Religion offers ${name}`)
  );
  // The Public sheet prints "Dining, other" lowercase.
  assert.ok(spaceTypesFor("Public").some((t) => t.name === "Dining, other"));
  // A retired "Dining: ..." stored value keeps only its stored attributes —
  // the old merged list is gone.
  assert.deepEqual(attributesForSpaceType("Domestic", "Dining", ["Hall"]), ["Hall"]);
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

test("stored attributes stay selectable when no sheet defines the type", () => {
  // "Exterior space" is on no 2026 sheet: only stored attributes survive.
  assert.deepEqual(attributesForSpaceType("Public", "Exterior space"), []);
  assert.deepEqual(attributesForSpaceType("Public", "Exterior space", ["Walled"]), ["Walled"]);
  // The sheets print "Other" with no attributes; stored attributes from an
  // old value still ride along through the union.
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