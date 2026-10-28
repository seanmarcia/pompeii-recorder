// The Public 2026 category sheet's typed lists: Late Usage, Rooms and
// Spaces, and Features and Their Attributes. Verbatim from the sheet; the
// shared option/attribute rules live in data/typeFields.js (see
// data/registry.js).

export const lateUsageTypes = [
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

export const spaceTypes = [
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

export const featureTypes = [
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
