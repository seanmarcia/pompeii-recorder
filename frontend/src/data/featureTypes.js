// Feature types and their optional attributes, split per 2026 category
// sheet. Same rules as data/lateUsage.js: options follow the sheet's
// Category, stored values outside the list stay selectable, and sheet text
// is verbatim. Types on no 2026 sheet (Kiln, Pipes, ...) are retired: never
// offered for new entries, and a stored one keeps only its stored
// attributes.
//
// Attributes are multi-select; a selected type + its attributes combine into
// a single "Type: Attr1; Attr2" string stored in FEATURE_TYPE_ID.
// Semicolon-delimited because some attribute values contain commas
// ("Quern, hand").

export const COMMERCIAL_FEATURE_TYPES = [
  { name: "Amphora", attributes: [] },
  { name: "Bench", attributes: ["Dining", "Streetside"] },
  {
    name: "Couch",
    attributes: ["Biclinium (masonry)", "Semicircular (masonry)", "Triclinium (masonry)"],
  },
  { name: "Counter", attributes: ["Dolium", "Hearth", "Stepped shelf", "Other"] },
  { name: "Dolium", attributes: [] },
  { name: "Graffito", attributes: [] },
  { name: "Grape/olive press", attributes: [] },
  { name: "Inscriptions", attributes: [] },
  { name: "Kitchen equipment", attributes: [] },
  { name: "Kneading basin", attributes: [] },
  { name: "Kneading machine", attributes: [] },
  { name: "Masonry support (wooden platform)", attributes: [] },
  { name: "Lararium", attributes: [] },
  { name: "Latrine", attributes: [] },
  {
    name: "Mill",
    attributes: ["Paving stones", "Quern, hand", "Rotary - animal", "Rotary - hand", "Other"],
  },
  { name: "Mosaic (Floor)", attributes: ["Dining couch pattern", "Food/drink pattern"] },
  { name: "Mosaic (Wall)", attributes: ["Food/drink subject"] },
  { name: "Niche", attributes: ["Couch", "Cupboard", "Shelf"] },
  { name: "Olive Crusher", attributes: [] },
  { name: "Oven", attributes: ["Beehive", "Enclosed", "Other"] },
  { name: "Paintings", attributes: ["Lararium", "Wall"] },
  {
    name: "Platform (Cooking)",
    attributes: [
      "Front lip",
      "Grill",
      "Hearth",
      "Rear shelf",
      "Recessed storage",
      "Roasting pit",
      "Stepped shelf",
      "Tiled surface",
      "Window",
    ],
  },
  { name: "Platform (Preparation)", attributes: [] },
  { name: "Sculpture (in situ)", attributes: [] },
  { name: "Shelf/Rack", attributes: [] },
  { name: "Trough", attributes: [] },
  { name: "Vat", attributes: [] },
  {
    name: "Water Features",
    attributes: [
      "Basin",
      "Cistern",
      "Drain",
      "Fish pond",
      "Fountain",
      "Gutter",
      "Pool",
      "Tank",
      "Well",
      "Other",
    ],
  },
  { name: "Other", attributes: [] },
];

export const DOMESTIC_FEATURE_TYPES = [
  { name: "Amphora", attributes: [] },
  { name: "Bench", attributes: ["Dining", "Streetside"] },
  {
    name: "Couch",
    attributes: [
      "Single",
      "Biclinium (masonry)",
      "Semicircular (masonry)",
      "Triclinium (masonry)",
      "Artificial stream and cascades",
    ],
  },
  { name: "Counter", attributes: ["Dolium", "Hearth", "Stepped shelf", "Other"] },
  { name: "Dolium", attributes: [] },
  { name: "Graffito", attributes: [] },
  { name: "Grape/olive press", attributes: [] },
  { name: "Inscriptions", attributes: [] },
  { name: "Kitchen equipment in situ", attributes: [] },
  { name: "Kneading basin", attributes: [] },
  { name: "Kneading machine", attributes: [] },
  { name: "Masonry support (wooden platform)", attributes: [] },
  { name: "Lararium", attributes: [] },
  { name: "Latrine", attributes: [] },
  {
    name: "Mill",
    attributes: ["Paving stones", "Quern, hand", "Rotary - animal", "Rotary - hand", "Other"],
  },
  { name: "Mosaic (Floor)", attributes: ["Dining couch pattern", "Food/drink pattern"] },
  { name: "Mosaic (Wall)", attributes: ["Food/drink subject"] },
  { name: "Niche", attributes: ["bench, couch", "cupboard", "shelf"] },
  { name: "Olive Crusher", attributes: [] },
  { name: "Oven", attributes: ["Beehive", "Enclosed", "Other"] },
  { name: "Paintings", attributes: ["Lararium", "Wall"] },
  {
    name: "Platform (Cooking)",
    attributes: [
      "Front lip",
      "Grill",
      "Hearth",
      "Rear shelf",
      "Recessed storage",
      "Roasting pit",
      "Stepped shelf",
      "Tiled surface",
      "Window",
    ],
  },
  { name: "Platform (Preparation)", attributes: [] },
  { name: "Sculpture, food/drink", attributes: [] },
  { name: "Shelf/Rack", attributes: [] },
  { name: "Trough", attributes: [] },
  { name: "Vat", attributes: [] },
  {
    name: "Water Features",
    attributes: [
      "Basin",
      "Cistern",
      "Drain",
      "Fish pond",
      "Fountain",
      "Gutter",
      "Pool",
      "Well",
      "Other",
    ],
  },
  { name: "Other", attributes: [] },
];

export const RELIGION_FEATURE_TYPES = [
  { name: "Altar", attributes: ["Crossroad"] },
  { name: "Amphora", attributes: [] },
  { name: "Bench", attributes: ["Dining", "Streetside"] },
  {
    name: "Couch",
    attributes: ["Biclinium (masonry)", "Semicircular (masonry)", "Triclinium (masonry)"],
  },
  { name: "Counter", attributes: ["Dolium", "Hearth", "Stepped shelf", "Other"] },
  { name: "Dolium", attributes: [] },
  { name: "Graffito", attributes: [] },
  { name: "Horticultural", attributes: [] },
  { name: "Inscriptions", attributes: [] },
  { name: "Kitchen equipment", attributes: [] },
  { name: "Lararium", attributes: [] },
  { name: "Latrine", attributes: [] },
  { name: "Mosaic (Floor)", attributes: ["Dining couch pattern", "Food/drink pattern"] },
  { name: "Mosaic (Wall)", attributes: ["Food/drink subject"] },
  { name: "Niche", attributes: ["bench/couch", "Crossroad"] },
  { name: "Paintings", attributes: ["Lararium", "Wall"] },
  {
    name: "Platform (Cooking)",
    attributes: [
      "Front lip",
      "Grill",
      "Hearth",
      "Rear shelf",
      "Recessed storage",
      "Roasting pit",
      "Stepped shelf",
      "Tiled surface",
      "Window",
      "Other",
    ],
  },
  { name: "Platform (Preparation)", attributes: [] },
  { name: "Sculpture (in situ)", attributes: [] },
  { name: "Trough", attributes: [] },
  { name: "Vat", attributes: [] },
  {
    name: "Water Features",
    attributes: [
      "Basin",
      "Cistern",
      "Drain",
      "Fish pond",
      "Fountain",
      "Gutter",
      "Pool",
      "Tank",
      "Well",
      "Other",
    ],
  },
  { name: "Other", attributes: [] },
];

export const PUBLIC_FEATURE_TYPES = [
  { name: "Altar", attributes: [] },
  { name: "Amphora", attributes: [] },
  { name: "Bench", attributes: ["Dining", "Streetside"] },
  {
    name: "Couch",
    attributes: ["Biclinium (masonry)", "Semicircular (masonry)", "Triclinium (masonry)"],
  },
  { name: "Counter", attributes: ["Dolium", "Hearth", "Stepped shelf", "Other"] },
  { name: "Dolium", attributes: [] },
  { name: "Graffito", attributes: [] },
  { name: "Grape/olive press", attributes: [] },
  { name: "Inscriptions", attributes: [] },
  { name: "Lararium", attributes: [] },
  { name: "Mosaic (Floor)", attributes: ["Dining couch pattern", "Food/drink pattern"] },
  { name: "Mosaic (Wall)", attributes: ["Food/drink subject"] },
  { name: "Niche", attributes: ["Bench, Couch", "Cupboard", "Shelf"] },
  { name: "Olive Crusher", attributes: [] },
  { name: "Paintings", attributes: ["Lararium", "Wall"] },
  // Not printed under Platform, cooking on the Public sheet; per Lisa it
  // carries the other sheets' set, including Other.
  {
    name: "Platform (Cooking)",
    attributes: [
      "Front lip",
      "Grill",
      "Hearth",
      "Rear shelf",
      "Recessed storage",
      "Roasting pit",
      "Stepped shelf",
      "Tiled surface",
      "Window",
      "Other",
    ],
  },
  { name: "Shelf/Rack", attributes: [] },
  { name: "Sculpture (in situ)", attributes: [] },
  { name: "Table", attributes: ["Weights & measures"] },
  { name: "Trough", attributes: [] },
  { name: "Vat", attributes: [] },
  {
    name: "Water Features",
    attributes: [
      "Basin",
      "Cistern",
      "Drain",
      "Fish pond",
      "Fountain",
      "Gutter",
      "Pool",
      "Well",
      "Other",
    ],
  },
  { name: "Other", attributes: [] },
];

const LISTS_BY_CATEGORY = {
  Commercial: COMMERCIAL_FEATURE_TYPES,
  Domestic: DOMESTIC_FEATURE_TYPES,
  Religion: RELIGION_FEATURE_TYPES,
  Public: PUBLIC_FEATURE_TYPES,
};

// The types offered for a sheet category. Blank (or unknown legacy) category
// offers nothing: pick a Category first. Order is the category sheet's order.
export function featureTypesFor(category) {
  return LISTS_BY_CATEGORY[category] || [];
}

// Options for the Feature Type select — same current + original extras as
// lateUsageOptionsFor.
export function featureTypeOptionsFor(category, currentTypeName, originalTypeName = "") {
  const names = featureTypesFor(category).map((t) => t.name);
  const extras = [currentTypeName, originalTypeName]
    .filter(Boolean)
    .filter((n) => !names.includes(n));
  return [...names, ...new Set(extras)];
}

// Attribute options for a selected type: the category's own definition, then
// another sheet's — first definition wins, so a type a sheet defines with no
// attributes does not inherit another sheet's set. Stored attributes are
// unioned in so a stored value keeps them selectable.
export function attributesForFeatureType(category, typeName, storedAttributes = []) {
  const own = featureTypesFor(category).find((t) => t.name === typeName);
  const definition =
    own || Object.values(LISTS_BY_CATEGORY).flat().find((t) => t.name === typeName);
  const ownAttributes = definition ? definition.attributes : [];
  const stored = Array.isArray(storedAttributes) ? storedAttributes : [];
  return [...new Set([...ownAttributes, ...stored])];
}

// Combine a feature type name and its selected attributes into a single stored value.
export function formatFeatureType(typeName, attributes = []) {
  if (!typeName) return "";
  if (!attributes.length) return typeName;
  return `${typeName}: ${attributes.join("; ")}`;
}

// Reverse of formatFeatureType, for hydrating the form from a stored value.
export function parseFeatureType(value) {
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