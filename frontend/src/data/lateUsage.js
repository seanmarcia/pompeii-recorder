// Late Usage categories and their optional sub-categories, from
// "Late Usage (terms and subcategories)". Sub-categories are multi-select; a
// selected category + its selected sub-categories are combined into a single
// "Type: Sub1; Sub2" string, the same pattern used for Feature Type and Space Type.
export const LATE_USAGE_TYPES = [
  { name: "Agricultural", attributes: ["Olive Grove", "Orchard", "Vineyard", "Other"] },
  { name: "Amphitheater", attributes: [] },
  { name: "Apartment", attributes: [] },
  { name: "Aqueduct", attributes: [] },
  { name: "Association structure", attributes: [] },
  { name: "Bakery", attributes: [] },
  { name: "Basilica", attributes: [] },
  { name: "Bath", attributes: [] },
  { name: "Ceramic workshop", attributes: [] },
  { name: "Colonnade (Arcade)", attributes: ["Forum", "Paving stones"] },
  { name: "Crossroad Shrine", attributes: [] },
  { name: "Distribution center", attributes: ["Food", "Drink"] },
  { name: "Food and drink processing", attributes: [] },
  { name: "Food and drink shop", attributes: ["Small", "Large", "Other"] },
  { name: "Gate", attributes: ["Lodging", "Tower"] },
  { name: "Gladiatorial barracks", attributes: [] },
  { name: "Gymnasium", attributes: [] },
  { name: "Hotel/Inn", attributes: [] },
  { name: "House", attributes: ["Farm", "Villa, city", "Villa, outside walls"] },
  { name: "House Shop", attributes: [] },
  { name: "Market", attributes: ["Building", "Cattle", "Vegetable", "Weights"] },
  { name: "Public space", attributes: ["Forum", "Intersections", "Open Areas", "Other"] },
  {
    name: "Public water",
    attributes: [
      "Reservoir",
      "Distribution Center",
      "Storage",
      "Tower",
      "Aqueduct",
      "Fountain, Public",
    ],
  },
  { name: "Restaurant", attributes: [] },
  { name: "Sewers", attributes: ["Large", "Storm", "Small", "Under sidewalk"] },
  { name: "Shop", attributes: [] },
  { name: "Shop House", attributes: [] },
  { name: "Storage/warehouse", attributes: ["Ice", "Granary"] },
  { name: "Street shrine", attributes: [] },
  { name: "Temple", attributes: ["Complex"] },
  { name: "Theater", attributes: ["Small", "Large"] },
  {
    name: "Tomb",
    attributes: [
      "Aedicula",
      "Altar",
      "Arch",
      "Bustum",
      "Chamber",
      "Columella",
      "Enclosure",
      "Exedra",
      "House",
      "Podium",
      "Schola (Bench)",
      "Temple",
      "Tholos",
      "Triclinium",
      "Tumulus",
      "Other",
    ],
  },
];

export function attributesForLateUsageType(typeName) {
  return LATE_USAGE_TYPES.find((t) => t.name === typeName)?.attributes || [];
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
