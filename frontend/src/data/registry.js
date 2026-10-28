// The registry composes the per-category bundles — one module per 2026
// category sheet (commercial.js, domestic.js, religion.js, public.js) — into
// the structures the typed selects consume. Adding or amending a category
// means touching that category's module; a new category also needs one entry
// in CATEGORY_BUNDLES here.

import * as commercial from "./commercial.js";
import * as domestic from "./domestic.js";
import * as religion from "./religion.js";
import * as publicSheet from "./public.js";

export const CATEGORY_BUNDLES = {
  Commercial: commercial,
  Domestic: domestic,
  Religion: religion,
  Public: publicSheet,
};

// The category's bundle, or null for a blank, unset, or unknown (legacy
// master) value: pick a Category first.
export function bundleFor(category) {
  return CATEGORY_BUNDLES[category] || null;
}

// Ordered lists for one kind ("lateUsageTypes" | "spaceTypes" |
// "featureTypes"): the category's own sheet first, then the other sheets in
// registry order — first definition wins across the chain. Legacy lists are
// not included: the space/feature adapters append them as the last fallback,
// and late usage has no legacy list.
export function typeListsFor(category, kind) {
  const otherLists = Object.entries(CATEGORY_BUNDLES)
    .filter(([name]) => name !== category)
    .map(([, bundle]) => bundle[kind]);
  const own = bundleFor(category);
  return own ? [own[kind], ...otherLists] : otherLists;
}
