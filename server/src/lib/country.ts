// Map a country name to its ISO 3166-1 alpha-2 code (for the client's flag) and
// a UI region bucket. Lets an admin add a server by typing just the country name
// — the code (which drives the flag) and region are filled in automatically.

// Common country names → ISO alpha-2. Extend freely; unknown names fall back to
// an empty code (the client shows a neutral disc instead of a broken flag).
const NAME_TO_CODE: Record<string, string> = {
  "united states": "US", "usa": "US", "united states of america": "US", "america": "US",
  "united kingdom": "GB", "uk": "GB", "britain": "GB", "great britain": "GB", "england": "GB",
  canada: "CA", germany: "DE", france: "FR", netherlands: "NL", spain: "ES", italy: "IT",
  portugal: "PT", ireland: "IE", belgium: "BE", switzerland: "CH", austria: "AT",
  sweden: "SE", norway: "NO", denmark: "DK", finland: "FI", poland: "PL", czechia: "CZ",
  "czech republic": "CZ", romania: "RO", greece: "GR", hungary: "HU", ukraine: "UA",
  russia: "RU", turkey: "TR", türkiye: "TR", iceland: "IS", luxembourg: "LU",
  nigeria: "NG", "south africa": "ZA", kenya: "KE", zimbabwe: "ZW", ghana: "GH",
  egypt: "EG", morocco: "MA", tanzania: "TZ", uganda: "UG", ethiopia: "ET", zambia: "ZM",
  angola: "AO", senegal: "SN", "cote d'ivoire": "CI", "ivory coast": "CI", cameroon: "CM",
  brazil: "BR", argentina: "AR", chile: "CL", colombia: "CO", peru: "PE", mexico: "MX",
  uruguay: "UY", ecuador: "EC", panama: "PA",
  india: "IN", pakistan: "PK", japan: "JP", singapore: "SG", china: "CN", "hong kong": "HK",
  "south korea": "KR", korea: "KR", indonesia: "ID", malaysia: "MY", thailand: "TH",
  vietnam: "VN", philippines: "PH", "united arab emirates": "AE", uae: "AE", "saudi arabia": "SA",
  israel: "IL", qatar: "QA", bangladesh: "BD", "sri lanka": "LK", taiwan: "TW", kazakhstan: "KZ",
  australia: "AU", "new zealand": "NZ",
}

// ISO code → UI region bucket. Must be one of the client's region groups so the
// server shows up in the locations list; unknown codes default to "Recommended".
const REGION_BY_CODE: Record<string, string> = {}
const put = (region: string, codes: string[]) => codes.forEach((c) => (REGION_BY_CODE[c] = region))
put("Africa", ["NG", "ZA", "KE", "ZW", "GH", "EG", "MA", "TZ", "UG", "ET", "ZM", "AO", "SN", "CI", "CM"])
put("Europe", ["GB", "DE", "FR", "NL", "ES", "IT", "PT", "IE", "BE", "CH", "AT", "SE", "NO", "DK", "FI", "PL", "CZ", "RO", "GR", "HU", "UA", "RU", "TR", "IS", "LU"])
put("Americas", ["US", "CA", "BR", "AR", "CL", "CO", "PE", "MX", "UY", "EC", "PA"])
put("Asia", ["IN", "PK", "JP", "SG", "CN", "HK", "KR", "ID", "MY", "TH", "VN", "PH", "AE", "SA", "IL", "QA", "BD", "LK", "TW", "KZ", "AU", "NZ"])

/** ISO alpha-2 code for a country name (""" if unknown). */
export function codeForCountry(country: string): string {
  return NAME_TO_CODE[country.trim().toLowerCase()] ?? ""
}

/** UI region bucket for an ISO code (defaults to "Recommended"). */
export function regionForCode(code: string): string {
  return REGION_BY_CODE[code.toUpperCase()] ?? "Recommended"
}
