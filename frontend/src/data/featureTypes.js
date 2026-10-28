// Feature types, per 2026 category sheet. The lists live in the category
// modules (data/commercial.js, data/domestic.js, data/religion.js,
// data/public.js); this adapter binds them to the shared rules in
// data/typeFields.js and keeps the public function signatures. Types on no
// 2026 sheet (Kiln, Pipes, ...) are retired: never offered for new entries,
// and a stored one keeps only its stored attributes.
//
// Attributes are multi-select; a selected type + its attributes combine into
// a single "Type: Attr1; Attr2" string stored in FEATURE_TYPE_ID.
// Semicolon-delimited because some attribute values contain commas
// ("Quern, hand").

import { bundleFor, typeListsFor } from "./registry.js";
import { optionsFor, attributesForType } from "./typeFields.js";

// The types offered for a sheet category. Blank (or unknown legacy) category
// offers nothing: pick a Category first. Order is the category sheet's order.
export function featureTypesFor(category) {
  return bundleFor(category)?.featureTypes || [];
}

// Options for the Feature Type select — same current + original extras as
// lateUsageOptionsFor.
export function featureTypeOptionsFor(category, currentTypeName, originalTypeName = "") {
  return optionsFor(featureTypesFor(category), currentTypeName, originalTypeName);
}

// Attribute options for a selected type: the category's own definition, then
// another sheet's — first definition wins, so a type a sheet defines with no
// attributes does not inherit another sheet's set. Stored attributes are
// unioned in so a stored value keeps them selectable.
export function attributesForFeatureType(category, typeName, storedAttributes = []) {
  return attributesForType(
    typeListsFor(category, "featureTypes"),
    typeName,
    storedAttributes
  );
}

export { formatTypedValue as formatFeatureType, parseTypedValue as parseFeatureType } from "./typeFields.js";
