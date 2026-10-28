// Room/space types, per 2026 category sheet. The lists live in the category
// modules (data/commercial.js, data/domestic.js, data/religion.js,
// data/public.js); this adapter binds them to the shared rules in
// data/typeFields.js and keeps the public function signatures. The dining
// lines are atomic options, one per printed line; the old merged "Dining:
// ..." values are retired and keep only their stored attributes.
//
// Attributes are multi-select; a selected type + its attributes combine into
// a single "Type: Attr1; Attr2" string stored in SPACE_TYPE_ID.

import { bundleFor, typeListsFor } from "./registry.js";
import { optionsFor, attributesForType } from "./typeFields.js";

// The types offered for a sheet category. Blank (or unknown legacy) category
// offers nothing: pick a Category first. Order is the category sheet's order.
export function spaceTypesFor(category) {
  return bundleFor(category)?.spaceTypes || [];
}

// Options for the Space Type select — same current + original extras as
// lateUsageOptionsFor.
export function spaceTypeOptionsFor(category, currentTypeName, originalTypeName = "") {
  return optionsFor(spaceTypesFor(category), currentTypeName, originalTypeName);
}

// Attribute options for a selected type: the category's own definition, then
// the other category sheets' — first definition wins. Stored attributes are
// unioned in so a stored value keeps them selectable.
export function attributesForSpaceType(category, typeName, storedAttributes = []) {
  return attributesForType(
    typeListsFor(category, "spaceTypes"),
    typeName,
    storedAttributes
  );
}

export { formatTypedValue as formatSpaceType, parseTypedValue as parseSpaceType } from "./typeFields.js";
