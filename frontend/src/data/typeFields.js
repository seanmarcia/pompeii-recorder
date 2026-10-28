// The shared rules for the typed selects (Feature Type, Space Type, Late
// Usage) — one implementation each, consumed with the category bundles from
// data/registry.js:
//
// - Options follow the sheet's Category (CATEGORY_ID), and a stored value
//   outside the category's list stays selectable — appended, never erased —
//   so an untouched sheet keeps its value instead of silently blanking.
// - Attribute options follow first definition wins: the category's own
//   definition, then the other sheets', then (where one exists) the legacy
//   list. A type a sheet defines with no attributes does not inherit
//   another sheet's set.
// - Stored attributes are unioned in so a legacy value keeps them selectable.
// - A selected type + its selected attributes combine into a single
//   "Type: Attr1; Attr2" string; semicolon-delimited because some attribute
//   values contain commas ("Quern, hand").
//
// Types on no 2026 sheet are deprecated: not offered for new entries, but a
// stored one keeps rendering via the rules above. Sheet text is verbatim;
// do not normalize names, casing, or punctuation across sheets ("Theater,
// Small" next to "Theatre, Large" is the sheet's own inconsistency).

// Options for a typed select: the category list's names, plus the field's
// current type and the originally-loaded type when either falls outside that
// list (deduped). The current extra keeps the select rendering; the original
// extra keeps the record's stored value recoverable for the session, so an
// accidental change is undone by re-picking instead of reloading.
export function optionsFor(typeList, currentTypeName, originalTypeName = "") {
  const names = typeList.map((t) => t.name);
  const extras = [currentTypeName, originalTypeName]
    .filter(Boolean)
    .filter((n) => !names.includes(n));
  return [...names, ...new Set(extras)];
}

// Attribute options for a selected type: first definition wins across the
// given lists — own category first, then the other sheets', then legacy
// where one exists. Stored attributes are unioned in so a legacy value keeps
// them selectable instead of dropping them.
export function attributesForType(typeLists, typeName, storedAttributes = []) {
  let definition;
  for (const typeList of typeLists) {
    definition = typeList.find((t) => t.name === typeName);
    if (definition) break;
  }
  const ownAttributes = definition ? definition.attributes : [];
  const stored = Array.isArray(storedAttributes) ? storedAttributes : [];
  return [...new Set([...ownAttributes, ...stored])];
}

// Combine a type name and its selected attributes into a single stored value.
export function formatTypedValue(typeName, attributes = []) {
  if (!typeName) return "";
  if (!attributes.length) return typeName;
  return `${typeName}: ${attributes.join("; ")}`;
}

// Reverse of formatTypedValue, for hydrating the form from a stored value.
export function parseTypedValue(value) {
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
