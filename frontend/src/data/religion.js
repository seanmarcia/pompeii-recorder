// The Religion 2026 category sheet's typed lists: Late Usage, Rooms and
// Spaces, and Features and Their Attributes. Verbatim from the sheet; the
// shared option/attribute rules live in data/typeFields.js (see
// data/registry.js).

export const lateUsageTypes = [
  { name: "Association Structure", attributes: [] },
  { name: "Crossroad Shrine", attributes: [] },
  { name: "Shop", attributes: [] },
  { name: "Storage", attributes: [] },
  { name: "Space - Public Eating and Drinking", attributes: [] },
  { name: "Temple", attributes: ["Temple Shop"] },
  { name: "Other", attributes: [] },
];

export const spaceTypes = [
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

export const featureTypes = [
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
