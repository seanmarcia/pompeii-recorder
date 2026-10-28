// Feature types and their optional attributes, split per category sheet
// (issue #27): each 2026 category sheet carries its own "Features and Their
// Attributes" list. Options follow the sheet's Category (CATEGORY_ID); a
// stored value that falls outside the category's list stays selectable so an
// untouched sheet keeps its value instead of silently blanking — the same
// pattern as Late Usage (data/lateUsage.js).
//
// Attributes are multi-select; a selected feature type + its attributes are
// combined into a single "Type: Attr1; Attr2" string and stored in one field
// (FEATURE_TYPE_ID). (Semicolon-delimited since some attribute values
// themselves contain commas, e.g. "Quern, hand".)
//
// Type names shared with the pre-2026 merged list keep that list's spelling
// (e.g. "Masonry Platform Supports", "Inscriptions") so stored values keep
// matching; genuinely new types are verbatim from the sheets. Attribute sets
// are exactly what each sheet prints; a stored attribute that a sheet no
// longer lists stays selectable through the stored-attribute union.
//
// Legacy types: the pre-2026 merged list (LEGACY_FEATURE_TYPES) is only a
// fallback — a type on no 2026 sheet (Kiln, Pipes, Epitaph, ...) keeps its
// legacy attributes when a stored value needs them, but no category list
// offers it for new entries.

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
  { name: "Masonry Platform Supports", attributes: [] },
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
      // The Domestic sheet prints "Artificial stream and cascades" indented in
      // the couch block.
      "Artificial stream and cascades",
    ],
  },
  { name: "Counter", attributes: ["Dolium", "Hearth", "Stepped shelf", "Other"] },
  { name: "Dolium", attributes: [] },
  { name: "Graffito", attributes: [] },
  { name: "Grape/olive press", attributes: [] },
  { name: "Inscriptions", attributes: [] },
  { name: "Kitchen equipment", attributes: [] },
  { name: "Kneading basin", attributes: [] },
  { name: "Kneading machine", attributes: [] },
  { name: "Masonry Platform Supports", attributes: [] },
  { name: "Lararium", attributes: [] },
  { name: "Latrine", attributes: [] },
  {
    name: "Mill",
    attributes: ["Paving stones", "Quern, hand", "Rotary - animal", "Rotary - hand", "Other"],
  },
  { name: "Mosaic (Floor)", attributes: ["Dining couch pattern", "Food/drink pattern"] },
  { name: "Mosaic (Wall)", attributes: ["Food/drink subject"] },
  { name: "Niche", attributes: ["Bench, couch", "Cupboard", "Shelf"] },
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
  // Verbatim from the Domestic sheet, next to Sculpture (in situ) on the
  // other three sheets.
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
  // The sheet prints "Niche, bench/couch" and a "Crossroad Niche" line; the
  // bench/couch spelling is normalized across the sheets that list it.
  { name: "Niche", attributes: ["Bench, couch", "Crossroad"] },
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
      // Only the Religion sheet lists an Other attribute here.
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
  { name: "Niche", attributes: ["Bench, couch", "Cupboard", "Shelf"] },
  { name: "Olive Crusher", attributes: [] },
  { name: "Paintings", attributes: ["Lararium", "Wall"] },
  // The Public sheet prints Platform, cooking with no attributes under it.
  { name: "Platform (Cooking)", attributes: [] },
  { name: "Shelf/Rack", attributes: [] },
  { name: "Sculpture (in situ)", attributes: [] },
  // The sheet prints "Table for Weights and Measures" as a flat feature.
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

// The pre-2026 merged list ("Features (terms and attributes)"). No longer
// offered for new entries; the attribute fallback for a stored type that no
// category sheet defines.
export const LEGACY_FEATURE_TYPES = [
  { name: "Altar", attributes: ["Crossroad"] },
  { name: "Amphora", attributes: [] },
  { name: "Bench", attributes: ["Dining", "Streetside"] },
  { name: "Ceramic", attributes: [] },
  {
    name: "Couch, dining",
    attributes: [
      "Biclinium (masonry)",
      "Semicircular (masonry)",
      "Triclinium (masonry)",
      "Single",
      "Water feature",
      "Table",
      "Other",
    ],
  },
  { name: "Counter", attributes: ["Dolium", "Hearth", "Stepped shelf", "Other"] },
  { name: "Dolium", attributes: [] },
  { name: "Epitaph", attributes: [] },
  { name: "Graffito", attributes: [] },
  { name: "Grape/olive press", attributes: [] },
  { name: "Horticultural", attributes: [] },
  { name: "Inscriptions", attributes: [] },
  { name: "Kiln", attributes: [] },
  { name: "Kitchen equipment", attributes: [] },
  { name: "Kneading basin", attributes: [] },
  { name: "Kneading machine", attributes: [] },
  { name: "Lararium", attributes: [] },
  { name: "Latrine", attributes: [] },
  { name: "Libation Tube", attributes: [] },
  { name: "Masonry Platform Supports", attributes: [] },
  {
    name: "Mill",
    attributes: ["Paving stones", "Quern, hand", "Rotary - animal", "Rotary - hand", "Other"],
  },
  { name: "Mosaic (Floor)", attributes: ["Dining couch pattern", "Food/drink pattern"] },
  { name: "Mosaic (Wall)", attributes: ["Food/drink subject"] },
  { name: "Niche", attributes: ["Couch", "Cupboard", "Shelf", "Crossroad"] },
  { name: "Olive Crusher", attributes: [] },
  { name: "Other", attributes: [] },
  { name: "Oven", attributes: ["Beehive", "Enclosed", "Other"] },
  { name: "Paintings", attributes: ["Relief", "Sculpture", "Lararium", "Wall"] },
  { name: "Pipes", attributes: ["Lead", "Terracotta"] },
  {
    name: "Platform (Cooking)",
    attributes: [
      "Front lip",
      "Grill",
      "Hearth",
      "Rear shelf",
      "Recessed storage",
      "Roasting pit",
      "Window",
      "Tiled surface",
      "Stepped shelf",
      "Other",
    ],
  },
  { name: "Platform (Preparation)", attributes: [] },
  { name: "Sculpture (in situ)", attributes: [] },
  { name: "Shelf/Rack", attributes: [] },
  { name: "Table", attributes: ["Weights & measures", "Atrium-located", "Offering"] },
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
      "Tank",
    ],
  },
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

// Options for the Feature Type select: the category's types, plus the field's
// current type and the originally-loaded type when either falls outside that
// list (deduped) — current so the select keeps rendering, original so the
// record's stored value stays recoverable for the session.
export function featureTypeOptionsFor(category, currentTypeName, originalTypeName = "") {
  const names = featureTypesFor(category).map((t) => t.name);
  const extras = [currentTypeName, originalTypeName]
    .filter(Boolean)
    .filter((n) => !names.includes(n));
  return [...names, ...new Set(extras)];
}

// Attribute options for a selected type: the category's own definition, then
// the other category sheets', then the legacy list — first definition wins,
// so a type a sheet defines with no attributes (Public Platform (Cooking))
// does not inherit another sheet's set. Stored attributes are unioned in so
// a legacy value keeps them selectable instead of dropping them.
export function attributesForFeatureType(category, typeName, storedAttributes = []) {
  const own = featureTypesFor(category).find((t) => t.name === typeName);
  const definition =
    own ||
    Object.values(LISTS_BY_CATEGORY).flat().find((t) => t.name === typeName) ||
    LEGACY_FEATURE_TYPES.find((t) => t.name === typeName);
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