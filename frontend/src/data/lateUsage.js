// Late Usage categories and their optional sub-categories, split per sheet
// category (issue #17): the 2026 Commercial and Domestic category sheets carry
// different "Late Usage of Structure" lists. Options follow the sheet's
// Category (CATEGORY_ID); a stored value that falls outside the category's
// list stays selectable so an untouched sheet keeps its value instead of
// silently blanking — the same pattern as Category (data/categories.js).
//
// Sub-categories are multi-select; a selected category + its selected
// sub-categories are combined into a single "Type: Sub1; Sub2" string, the
// same pattern used for Feature Type and Space Type.
//
// Deprecated types: the old merged list contained values on neither 2026
// sheet (Amphitheater, Basilica, Temple, Tomb, ...). A sheet that already
// stores one keeps it visible; new sheets cannot select them (no category
// list offers them, and a blank category offers nothing).

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

const LISTS_BY_CATEGORY = {
  Commercial: COMMERCIAL_LATE_USAGE_TYPES,
  Domestic: DOMESTIC_LATE_USAGE_TYPES,
};

// The types offered for a sheet category. Blank (or unknown) category offers
// nothing: pick a Category first. Order is the category sheet's order.
export function lateUsageTypesFor(category) {
  return LISTS_BY_CATEGORY[category] || [];
}

// Options for the Late Usage select: the category's types, keeping a stored
// legacy value selectable when it falls outside that list.
export function lateUsageOptionsFor(category, storedTypeName) {
  const names = lateUsageTypesFor(category).map((t) => t.name);
  const extra = storedTypeName && !names.includes(storedTypeName) ? [storedTypeName] : [];
  return [...names, ...extra];
}

// Sub-category options for a selected type. `category` is unused today: base
// is the type's own list (whichever category sheet defines it), so the
// parameter exists for callers that pass it and for a future per-category
// attribute split. Stored attributes are unioned in so a legacy value keeps
// them selectable instead of dropping them.
export function attributesForLateUsageType(category, typeName, storedAttributes = []) {
  const own =
    Object.values(LISTS_BY_CATEGORY).flat().find((t) => t.name === typeName)?.attributes || [];
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
