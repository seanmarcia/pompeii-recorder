// Room/space types and their optional attributes, split per category sheet
// (issue #27): each 2026 category sheet carries its own "Rooms and Spaces"
// list. Options follow the sheet's Category (CATEGORY_ID); a stored value
// that falls outside the category's list stays selectable so an untouched
// sheet keeps its value instead of silently blanking — the same pattern as
// Late Usage (data/lateUsage.js).
//
// Attributes are multi-select; a selected space type + its attributes are
// combined into a single "Type: Attr1; Attr2" string and stored in one field
// (SPACE_TYPE_ID).
//
// The sheets print the dining variants ("Dining Garden/Peristyle", "Dining
// Hall", ...) as separate lines; they are modeled as the Dining type with
// attributes, the existing convention. Type names shared with the pre-2026
// merged list keep that list's spelling ("Press room", "Mill/Oven room", ...)
// so stored values keep matching; genuinely new types are verbatim from the
// sheets.
//
// Legacy types: the pre-2026 merged list (LEGACY_SPACE_TYPES) is only a
// fallback — a type on no 2026 sheet (Burial chamber, Colombarium, ...) keeps
// its legacy attributes when a stored value needs them, but no category list
// offers it for new entries.

export const COMMERCIAL_SPACE_TYPES = [
  { name: "Atrium", attributes: [] },
  { name: "Counter Room", attributes: [] },
  {
    name: "Dining",
    attributes: ["Garden / Peristyle", "Hall", "Room", "Second Floor", "Other"],
  },
  { name: "Horticultural", attributes: [] },
  { name: "Kitchen", attributes: [] },
  { name: "Mill room", attributes: [] },
  { name: "Mill/Oven room", attributes: [] },
  { name: "Oven room", attributes: [] },
  { name: "Processing room", attributes: [] },
  { name: "Preparation room", attributes: [] },
  { name: "Press room", attributes: [] },
  // Printed under Rooms and Spaces on the Commercial sheet.
  { name: "Rack", attributes: [] },
  { name: "Sales room", attributes: [] },
  { name: "Serving room", attributes: [] },
  { name: "Shop", attributes: [] },
  { name: "Portable cart space", attributes: [] },
  { name: "Space for Public Banquets", attributes: [] },
  { name: "Food Stall Space", attributes: [] },
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
  {
    name: "Dining",
    attributes: ["Garden / Peristyle", "Hall", "Room", "Second Floor", "Tablinum", "Other"],
  },
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
  // Verbatim from the Domestic sheet's banquet lines.
  { name: "Space - Communal Banqueting", attributes: [] },
  { name: "Space - Public Banquets", attributes: [] },
  { name: "Stable", attributes: [] },
  { name: "Storeroom", attributes: [] },
  { name: "Other", attributes: [] },
];

export const RELIGION_SPACE_TYPES = [
  { name: "Atrium", attributes: [] },
  // The Religion sheet prints "Dining Garden" (no /Peristyle).
  { name: "Dining", attributes: ["Garden", "Hall", "Room", "Second Floor", "Tablinum", "Other"] },
  { name: "Horticultural", attributes: [] },
  { name: "Kitchen", attributes: [] },
  // The sheet's "Public Banquet Space (Epulum)" line, flat with no attributes.
  { name: "Banquet Space (Epulum)", attributes: [] },
  { name: "Processing room", attributes: [] },
  { name: "Preparation room", attributes: [] },
  { name: "Space around altars", attributes: [] },
  { name: "Serving room", attributes: [] },
  { name: "Shop", attributes: [] },
  { name: "Space for cooking", attributes: [] },
  { name: "Space for Public Banquets", attributes: [] },
  { name: "Storeroom", attributes: [] },
  { name: "Other", attributes: [] },
];

export const PUBLIC_SPACE_TYPES = [
  { name: "Counter Room", attributes: [] },
  {
    name: "Dining",
    attributes: ["Other", "Garden / Peristyle", "Hall", "Room", "Second Floor"],
  },
  { name: "Horticultural", attributes: [] },
  { name: "Kitchen", attributes: [] },
  { name: "Processing room", attributes: [] },
  { name: "Preparation room", attributes: [] },
  { name: "Food Stall Space", attributes: [] },
  { name: "Space for Public Banquets", attributes: [] },
  { name: "Portable cart space", attributes: [] },
  { name: "Serving room", attributes: [] },
  { name: "Storeroom", attributes: [] },
  { name: "Other", attributes: [] },
];

// The pre-2026 merged list ("Rooms and Spaces (agreed terms and attributes)").
// No longer offered for new entries; the attribute fallback for a stored type
// that no category sheet defines.
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

// Options for the Space Type select: the category's types, plus the field's
// current type and the originally-loaded type when either falls outside that
// list (deduped) — current so the select keeps rendering, original so the
// record's stored value stays recoverable for the session.
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