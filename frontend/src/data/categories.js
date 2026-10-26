// Category is restricted to Commercial and Domestic for new entries and any
// change. Legacy master values (Public, Religious, ...) stay selectable so an
// untouched sheet keeps its value instead of silently blanking.
export const CATEGORY_OPTIONS = ["Commercial", "Domestic"];

// Options for the Category select: the restricted list, keeping a stored
// legacy value selectable when it falls outside that list.
export function categoryOptionsFor(storedValue) {
  const extra = storedValue && !CATEGORY_OPTIONS.includes(storedValue) ? [storedValue] : [];
  return ["", ...CATEGORY_OPTIONS, ...extra];
}
