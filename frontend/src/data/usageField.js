// Usage Classification (Commercial/Domestic) and Late Usage (category + sub-categories)
// are two separate selectors in the UI, but are combined into the single existing
// USAGE_ID field for storage: "Commercial | Bakery: Oven; Enclosed".
import { formatLateUsageType, parseLateUsageType } from "./lateUsage";

export const USAGE_CLASSIFICATIONS = ["Commercial", "Domestic"];

export function formatUsageField(usageClassification, lateUsageTypeName, lateUsageAttributes = []) {
  const lateUsageValue = formatLateUsageType(lateUsageTypeName, lateUsageAttributes);
  if (usageClassification && lateUsageValue) return `${usageClassification} | ${lateUsageValue}`;
  return usageClassification || lateUsageValue || "";
}

// Reverse of formatUsageField, for hydrating the form from a stored value.
export function parseUsageField(value) {
  if (!value) {
    return { usageClassification: "", lateUsageTypeName: "", lateUsageAttributes: [] };
  }

  const separatorIndex = value.indexOf(" | ");
  let usageClassification = "";
  let lateUsagePart = value;

  if (separatorIndex !== -1) {
    usageClassification = value.slice(0, separatorIndex).trim();
    lateUsagePart = value.slice(separatorIndex + 3).trim();
  } else if (USAGE_CLASSIFICATIONS.includes(value.trim())) {
    usageClassification = value.trim();
    lateUsagePart = "";
  }

  const { typeName, attributes } = parseLateUsageType(lateUsagePart);
  return { usageClassification, lateUsageTypeName: typeName, lateUsageAttributes: attributes };
}
