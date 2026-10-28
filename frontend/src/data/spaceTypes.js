// Room/space types and their optional attributes, split per 2026 category
// sheet. Same rules as data/lateUsage.js: options follow the sheet's
// Category, stored values outside the list stay selectable, and sheet text
// is verbatim. The dining lines are atomic options, one per printed line; a
// legacy stored "Dining: ..." value still finds its attributes through
// LEGACY_SPACE_TYPES (the pre-2026 merged list, fallback only — never
// offered for new entries).
//
// Attributes are multi-select; a selected type + its attributes combine into
// a single "Type: Attr1; Attr2" string stored in SPACE_TYPE_ID.

export const COMMERCIAL_SPACE_TYPES = [
  { name: "Atrium", attributes: [] },
  { name: "Counter Room", attributes: [] },
  { name: "Dining Garden/Peristyle", attributes: [] },
  { name: "Dining Hall", attributes: [] },
  { name: "Dining Room", attributes: [] },
  { name: "Dining Second Floor", attributes: [] },
  { name: "Dining, Other", attributes: [] },
  { name: "Horticultural", attributes: [] },
  { name: "Kitchen", attributes: [] },
  { name: "Mill room", attributes: [] },
  { name: "Mill/Oven room", attributes: [] },
  { name: "Oven room", attributes: [] },
  { name: "Processing room", attributes: [] },
  { name: "Preparation room", attributes: [] },
  { name: "Press room", attributes: [] },
  // Rack is a Rooms and Spaces line on the Commercial sheet.
  { name: "Rack", attributes: [] },
  { name: "Sales room", attributes: [] },
  { name: "Serving room", attributes: [] },
  { name: "Shop", attributes: [] },
  { name: "Space for Portable Carts", attributes: [] },
  { name: "Space for Public Banquets", attributes: [] },
  { name: "Space for Food Stall", attributes: [] },
  { name: "Stable", attributes: [] },
  { name: "Storeroom", attributes: [] },
  { name: "Tablinum", attributes: [] },
  { name: "Other", attributes: [] },
];

export const DOMESTIC_SPACE_TYPES = [
  { name: "Ambulatory", attributes: [] },
  { name: "Atrium", attributes: [] },
  { name: "Counter Room", attributes: [] },
  { name: "Diaeta", attributes: [] },
  { name: "Dining Garden/Peristyle", attributes: [] },
  { name: "Dining Hall", attributes: [] },
  { name: "Dining Room", attributes: [] },
  { name: "Dining Second Floor", attributes: [] },
  { name: "Dining Tablinum", attributes: [] },
  { name: "Dining, Other", attributes: [] },
  { name: "Granary", attributes: [] },
  { name: "Horticultural", attributes: [] },
  { name: "Kitchen", attributes: [] },
  { name: "Mill room", attributes: [] },
  { name: "Mill/Oven room", attributes: [] },
  { name: "Oven room", attributes: [] },
  { name: "Processing room", attributes: [] },
  { name: "Preparation room", attributes: [] },
  { name: "Press room", attributes: [] },
  { name: "Sales room", attributes: [] },
  { name: "Serving room", attributes: [] },
  { name: "Shop", attributes: [] },
  { name: "Space - Communal Banqueting", attributes: [] },
  { name: "Space - Public Banquets", attributes: [] },
  { name: "Stable", attributes: [] },
  { name: "Storeroom", attributes: [] },
  { name: "Other", attributes: [] },
];

export const RELIGION_SPACE_TYPES = [
  { name: "Atrium", attributes: [] },
  { name: "Dining Garden", attributes: [] },
  { name: "Dining Hall", attributes: [] },
  { name: "Dining Room", attributes: [] },
  { name: "Dining Second Floor", attributes: [] },
  { name: "Dining Tablinum", attributes: [] },
  { name: "Dining, Other", attributes: [] },
  { name: "Horticultural", attributes: [] },
  { name: "Kitchen", attributes: [] },
  { name: "Public Banquet Space (Epulum)", attributes: [] },
  { name: "Processing room", attributes: [] },
  { name: "Preparation room", attributes: [] },
  { name: "Space around altars", attributes: [] },
  { name: "Serving room", attributes: [] },
  { name: "Shop", attributes: [] },
  { name: "Space for cooking", attributes: [] },
  // "Space  for Public Banquets" on the sheet; extra whitespace cleaned.
  { name: "Space for Public Banquets", attributes: [] },
  { name: "Storeroom", attributes: [] },
  { name: "Other", attributes: [] },
];

export const PUBLIC_SPACE_TYPES = [
  { name: "Counter Room", attributes: [] },
  { name: "Dining, other", attributes: [] },
  { name: "Dining Garden/Peristyle", attributes: [] },
  { name: "Dining Hall", attributes: [] },
  { name: "Dining Room", attributes: [] },
  { name: "Dining Second Floor", attributes: [] },
  { name: "Horticultural", attributes: [] },
  { name: "Kitchen", attributes: [] },
  { name: "Processing room", attributes: [] },
  { name: "Preparation room", attributes: [] },
  { name: "Space for Food Stall", attributes: [] },
  // Singular, as printed on the Public sheet.
  { name: "Space for Public Banquet", attributes: [] },
  { name: "Space for Portable Carts", attributes: [] },
  { name: "Serving room", attributes: [] },
  { name: "Storeroom", attributes: [] },
  { name: "Other", attributes: [] },
];

export const LEGACY_SPACE_TYPES = [
  { name: "Ambulatory", attributes: [] },
  { name: "Space around altars", attributes: [] },
  { name: "Atrium", attributes: [] },
  { name: "Burial chamber", attributes: [] },
  { name: "Closed Room for Live Sacrifice Animals", attributes: [] },
  { name: "Colombarium", attributes: [] },
  { name: "Banquet Space (epulum)", attributes: ["Communal", "Public", "Religious", "Cemetery"] },
  { name: "Counter Room", attributes: [] },
  { name: "Diaeta", attributes: [] },
  {
    name: "Dining",
    attributes: [
      "Porch",
      "Garden / Peristyle",
      "Hall",
      "Room",
      "Second Floor",
      "Tablinum",
      "Other",
    ],
  },
  { name: "Exterior space", attributes: ["Walled", "Open", "Street", "Sidewalk"] },
  { name: "Food Stall Space", attributes: [] },
  { name: "Garden", attributes: [] },
  { name: "Granary", attributes: [] },
  { name: "Horticultural", attributes: [] },
  { name: "Kitchen", attributes: [] },
  { name: "Lobby", attributes: [] },
  { name: "Mill/Oven room", attributes: [] },
  { name: "Mill room", attributes: [] },
  { name: "Other", attributes: ["Ala", "Cubiculum", "Andron", "Passageway"] },
  { name: "Oven room", attributes: [] },
  { name: "Porch", attributes: [] },
  { name: "Portable cart space", attributes: [] },
  { name: "Preparation room", attributes: [] },
  { name: "Press room", attributes: [] },
  { name: "Processing room", attributes: [] },
  { name: "Sales room", attributes: [] },
  { name: "Serving room", attributes: [] },
  { name: "Shop", attributes: [] },
  { name: "Space for cooking", attributes: [] },
  { name: "Stable", attributes: [] },
  { name: "Storeroom", attributes: [] },
  { name: "Tablinum", attributes: [] },
];

const LISTS_BY_CATEGORY = {
  Commercial: COMMERCIAL_SPACE_TYPES,
  Domestic: DOMESTIC_SPACE_TYPES,
  Religion: RELIGION_SPACE_TYPES,
  Public: PUBLIC_SPACE_TYPES,
};

// The types offered for a sheet category. Blank (or unknown legacy) category
// offers nothing: pick a Category first. Order is the category sheet's order.
export function spaceTypesFor(category) {
  return LISTS_BY_CATEGORY[category] || [];
}

// Options for the Space Type select — same current + original extras as
// lateUsageOptionsFor.
export function spaceTypeOptionsFor(category, currentTypeName, originalTypeName = "") {
  const names = spaceTypesFor(category).map((t) => t.name);
  const extras = [currentTypeName, originalTypeName]
    .filter(Boolean)
    .filter((n) => !names.includes(n));
  return [...names, ...new Set(extras)];
}

// Attribute options for a selected type: the category's own definition, then
// the other category sheets', then the legacy list — first definition wins.
// Stored attributes are unioned in so a legacy value keeps them selectable
// instead of dropping them.
export function attributesForSpaceType(category, typeName, storedAttributes = []) {
  const own = spaceTypesFor(category).find((t) => t.name === typeName);
  const definition =
    own ||
    Object.values(LISTS_BY_CATEGORY).flat().find((t) => t.name === typeName) ||
    LEGACY_SPACE_TYPES.find((t) => t.name === typeName);
  const ownAttributes = definition ? definition.attributes : [];
  const stored = Array.isArray(storedAttributes) ? storedAttributes : [];
  return [...new Set([...ownAttributes, ...stored])];
}

// Combine a space type name and its selected attributes into a single stored value.
export function formatSpaceType(typeName, attributes = []) {
  if (!typeName) return "";
  if (!attributes.length) return typeName;
  return `${typeName}: ${attributes.join("; ")}`;
}

// Reverse of formatSpaceType, for hydrating the form from a stored value.
export function parseSpaceType(value) {
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