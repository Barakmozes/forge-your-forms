import en from "@/i18n/locales/en.json";
import he from "@/i18n/locales/he.json";

/**
 * Recursively extract all dot-separated keys from a nested object.
 */
function extractKeys(obj: Record<string, unknown>, prefix = ""): string[] {
  const keys: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      keys.push(...extractKeys(value as Record<string, unknown>, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

describe("i18n translations", () => {
  const enKeys = extractKeys(en);
  const heKeys = extractKeys(he);

  it("en.json has translation keys", () => {
    expect(enKeys.length).toBeGreaterThan(0);
  });

  it("he.json has translation keys", () => {
    expect(heKeys.length).toBeGreaterThan(0);
  });

  it("all en.json keys exist in he.json", () => {
    const heKeySet = new Set(heKeys);
    const missingInHe = enKeys.filter((key) => !heKeySet.has(key));

    if (missingInHe.length > 0) {
      console.warn(`Keys missing in he.json (${missingInHe.length}):\n${missingInHe.slice(0, 10).join("\n")}`);
    }

    // All keys must have translations — 0% tolerance
    expect(missingInHe.length).toBe(0);
  });

  it("all he.json keys exist in en.json", () => {
    const enKeySet = new Set(enKeys);
    const missingInEn = heKeys.filter((key) => !enKeySet.has(key));

    if (missingInEn.length > 0) {
      console.warn(`Keys missing in en.json (${missingInEn.length}):\n${missingInEn.slice(0, 10).join("\n")}`);
    }

    // All keys must have translations — 0% tolerance
    expect(missingInEn.length).toBe(0);
  });

  it("en.json values are non-empty strings at leaf level", () => {
    const emptyKeys = enKeys.filter((key) => {
      const parts = key.split(".");
      let val: unknown = en;
      for (const part of parts) {
        val = (val as Record<string, unknown>)[part];
      }
      return typeof val === "string" && val.trim() === "";
    });

    expect(emptyKeys).toEqual([]);
  });

  it("he.json values are non-empty strings at leaf level", () => {
    const emptyKeys = heKeys.filter((key) => {
      const parts = key.split(".");
      let val: unknown = he;
      for (const part of parts) {
        val = (val as Record<string, unknown>)[part];
      }
      return typeof val === "string" && val.trim() === "";
    });

    expect(emptyKeys).toEqual([]);
  });

  it("translation files have mostly matching top-level sections", () => {
    const enSections = new Set(Object.keys(en));
    const heSections = new Set(Object.keys(he));

    const missingInHe = [...enSections].filter((s) => !heSections.has(s));
    const missingInEn = [...heSections].filter((s) => !enSections.has(s));

    // All sections must match exactly
    expect(missingInHe.length).toBe(0);
    expect(missingInEn.length).toBe(0);
  });
});
