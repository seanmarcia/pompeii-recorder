// Late Usage types, per 2026 category sheet. The lists live in the category
// modules (data/commercial.js, data/domestic.js, data/religion.js,
// data/public.js); this adapter binds them to the shared rules in
// data/typeFields.js and keeps the public function signatures.
//
// Sub-categories are multi-select; a selected type + its selected
// sub-categories combine into a single "Type: Sub1; Sub2" string stored in
// USAGE_ID (a retired classification prefix is preserved on rebuild — see
// data/usageField.js).

import { bundleFor, typeListsFor } from "./registry.js";
import { optionsFor, attributesForType } from "./typeFields.js";

// The types offered for a sheet category. Blank (or unknown) category offers
// nothing: pick a Category first. Order is the category sheet's order.
export function lateUsageTypesFor(category) {
  return bundleFor(category)?.lateUsageTypes || [];
}

// Options for the Late Usage select: the category's types, plus the field's
// current type and the originally-loaded type when either falls outside that
// list (deduped). The current extra keeps the select rendering; the original
// extra keeps the record's stored value recoverable for the session, so an
// accidental change is undone by re-picking instead of reloading.
export function lateUsageOptionsFor(category, currentTypeName, originalTypeName = "") {
  return optionsFor(lateUsageTypesFor(category), currentTypeName, originalTypeName);
}

// Sub-category options for a selected type: the category's own definition,
// then another sheet's — first definition wins. Stored attributes are
// unioned in so a legacy value keeps them selectable instead of dropping them.
export function attributesForLateUsageType(category, typeName, storedAttributes = []) {
  return attributesForType(typeListsFor(category, "lateUsageTypes"), typeName, storedAttributes);
}

export { formatTypedValue as formatLateUsageType, parseTypedValue as parseLateUsageType } from "./typeFields.js";
