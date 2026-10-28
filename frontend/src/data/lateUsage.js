// Late Usage types and their optional sub-categories, split per 2026
// category sheet. The option rule, shared by Feature Type and Space Type
// (data/featureTypes.js, data/spaceTypes.js): options follow the sheet's
// Category (CATEGORY_ID), and a stored value outside the category's list
// stays selectable — appended, never erased — so an untouched sheet keeps
// its value instead of silently blanking. Sheet text is verbatim; do not
// normalize names, casing, or punctuation across sheets ("Theater, Small"
// next to "Theatre, Large" is the sheet's own inconsistency). Types on no
// 2026 sheet are deprecated: not offered for new entries, but a stored one
// keeps rendering via the rule above.
//
// Sub-categories are multi-select; a selected type + its selected
// sub-categories combine into a single "Type: Sub1; Sub2" string stored in
// USAGE_ID (a retired classification prefix is preserved on rebuild — see
// data/usageField.js).

export const COMMERCIAL_LATE_USAGE_TYPES = [
  { name: "Agricultural", attributes: ["Olive Grove", "Orchard", "Vineyard", "Other"] },
  { name: "Bakery", attributes: [] },
  { name: "Hotel/Inn", attributes: [] },
  { name: "Market Building", attributes: ["Cattle", "Vegetable"] },
  { name: "Food Distribution Center", attributes: [] },
  { name: "Drink Distribution Center", attributes: [] },
  { name: "Food & Drink Shop", attributes: ["Small", "Large", "Food processing", "Other"] },
  { name: "Restaurant", attributes: [] },
  { name: "Shop-House", attributes: [] },
  { name: "Space for Public Eating and Drinking", attributes: [] },
  { name: "Storage", attributes: [] },
  { name: "Thermopolium", attributes: [] },
  { name: "Warehouse/Granary", attributes: [] },
  { name: "Other", attributes: [] },
];

export const DOMESTIC_LATE_USAGE_TYPES = [
  { name: "Apartment", attributes: [] },
  { name: "Farm House", attributes: [] },
  { name: "House", attributes: [] },
  { name: "House-Shop", attributes: [] },
  { name: "Space - Public Eating and Drinking", attributes: [] },
  { name: "Villa rustica", attributes: [] },
  { name: "Villa Urbana", attributes: [] },
  { name: "Other", attributes: [] },
];

export const RELIGION_LATE_USAGE_TYPES = [
  { name: "Association Structure", attributes: [] },
  { name: "Crossroad Shrine", attributes: [] },
  { name: "Shop", attributes: [] },
  { name: "Storage", attributes: [] },
  { name: "Space - Public Eating and Drinking", attributes: [] },
  { name: "Temple", attributes: ["Temple Shop"] },
  { name: "Other", attributes: [] },
];

export const PUBLIC_LATE_USAGE_TYPES = [
  { name: "Amphitheater", attributes: [] },
  { name: "Basilica", attributes: [] },
  { name: "Bath", attributes: [] },
  { name: "Civic Building-Archives", attributes: [] },
  { name: "Colonnade-forum", attributes: [] },
  { name: "paving stones", attributes: [] },
  { name: "Fountain, public", attributes: [] },
  { name: "Gate", attributes: [] },
  { name: "Gladiatorial Barracks", attributes: [] },
  { name: "Gymnasium", attributes: [] },
  { name: "Market Building", attributes: [] },
  { name: "Market, Cattle", attributes: [] },
  { name: "Market, Vegetable", attributes: [] },
  { name: "Space-Public Eating and Drinking", attributes: [] },
  { name: "Storage (Cool storage chamber)", attributes: [] },
  { name: "Table for Weights and Measures", attributes: [] },
  { name: "Theater, Small", attributes: [] },
  { name: "Theatre, Large", attributes: [] },
  { name: "Water Reservoir", attributes: [] },
  { name: "Water Distribution Center", attributes: [] },
  { name: "Water Storage", attributes: [] },
  { name: "Water Tower", attributes: [] },
];

const LISTS_BY_CATEGORY = {
  Commercial: COMMERCIAL_LATE_USAGE_TYPES,
  Domestic: DOMESTIC_LATE_USAGE_TYPES,
  Religion: RELIGION_LATE_USAGE_TYPES,
  Public: PUBLIC_LATE_USAGE_TYPES,
};

// The types offered for a sheet category. Blank (or unknown) category offers
// nothing: pick a Category first. Order is the category sheet's order.
export function lateUsageTypesFor(category) {
  return LISTS_BY_CATEGORY[category] || [];
}

// Options for the Late Usage select: the category's types, plus the field's
// current type and the originally-loaded type when either falls outside that
// list (deduped). The current extra keeps the select rendering; the original
// extra keeps the record's stored value recoverable for the session, so an
// accidental change is undone by re-picking instead of reloading.
export function lateUsageOptionsFor(category, currentTypeName, originalTypeName = "") {
  const names = lateUsageTypesFor(category).map((t) => t.name);
  const extras = [currentTypeName, originalTypeName]
    .filter(Boolean)
    .filter((n) => !names.includes(n));
  return [...names, ...new Set(extras)];
}

// Sub-category options for a selected type: the category's own definition,
// then another sheet's — first definition wins. Stored attributes are
// unioned in so a legacy value keeps them selectable instead of dropping them.
export function attributesForLateUsageType(category, typeName, storedAttributes = []) {
  const own =
    (LISTS_BY_CATEGORY[category] || []).find((t) => t.name === typeName)?.attributes ||
    Object.values(LISTS_BY_CATEGORY).flat().find((t) => t.name === typeName)?.attributes ||
    [];
  const stored = Array.isArray(storedAttributes) ? storedAttributes : [];
  return [...new Set([...own, ...stored])];
}

// Combine a Late Usage category and its selected sub-categories into a single value.
export function formatLateUsageType(typeName, attributes = []) {
  if (!typeName) return "";
  if (!attributes.length) return typeName;
  return `${typeName}: ${attributes.join("; ")}`;
}

// Reverse of formatLateUsageType, for hydrating the form from a stored value.
export function parseLateUsageType(value) {
  if (!value) return { typeName: "", attributes: [] };
  const separatorIndex = value.indexOf(":");
  if (separatorIndex === -1) return { typeName: value.trim(), attributes: [] };
  return {
    typeName: value.slice(0, separatorIndex).trim(),
    attributes: value
      .slice(separatorIndex + 1)
      .split(";")
      .map((a) => a.trim())
      .filter(Boolean),
  };
}
