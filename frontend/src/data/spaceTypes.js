// Room/space types and their optional attributes, from "Rooms and Spaces (agreed terms and attributes)".
// Attributes are multi-select; a selected space type + its attributes are combined
// into a single "Type: Attr1; Attr2" string and stored in one field (SPACE_TYPE_ID).
export const SPACE_TYPES = [
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

export function attributesForSpaceType(typeName) {
  return SPACE_TYPES.find((s) => s.name === typeName)?.attributes || [];
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
