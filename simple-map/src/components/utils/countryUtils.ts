export const COUNTRY_ALIASES: Record<string, string[]> = {
  "United States": ["USA", "United States of America", "US", "U.S.A.", "United States"],
  "United Arab Emirates": ["UAE", "United Arab Emirates", "U.A.E."],
  "United Kingdom": ["UK", "GB", "Great Britain", "United Kingdom", "England", "Scotland", "Wales", "Northern Ireland"],
};

export function normalizeCountryName(name?: string | null) {
  if (!name) return "";
  const s = name.trim().toLowerCase();
  // check if name matches any alias
  for (const canonical of Object.keys(COUNTRY_ALIASES)) {
    const aliases = COUNTRY_ALIASES[canonical];
    for (const a of aliases.concat([canonical])) {
      if (a.toLowerCase() === s) return canonical;
    }
  }
  // fallback: capitalize words
  return name.trim();
}

export function sameCountry(a?: string, b?: string | null) {
  return normalizeCountryName(a) === normalizeCountryName(b);
}
