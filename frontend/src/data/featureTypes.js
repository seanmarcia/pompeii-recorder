// Feature types and their optional attributes, from "Features (terms and attributes)".
// Attributes are multi-select; a selected feature type + its attributes are combined
// into a single "Type: Attr1; Attr2" string and stored in one field (FEATURE_TYPE_ID).
// (Semicolon-delimited since some attribute values themselves contain commas, e.g. "Quern, hand".)
export const FEATURE_TYPES = [
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
    ],
  },
  { name: "Platform (Preparation)", attributes: [] },
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

export function attributesForFeatureType(typeName) {
  return FEATURE_TYPES.find((f) => f.name === typeName)?.attributes || [];
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
