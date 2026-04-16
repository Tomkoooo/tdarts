/**
 * Stored in user.country for users who are not tied to a single ISO territory.
 * Not an assigned ISO 3166-1 alpha-2 country; conventional internal sentinel.
 */
export const INTERNATIONAL_COUNTRY_CODE = 'XX' as const;

export function isUserCountryCompleteForOnboarding(country: string | null | undefined): boolean {
  if (country == null || String(country).trim() === '') return false;
  const c = String(country).trim().toUpperCase();
  if (c === INTERNATIONAL_COUNTRY_CODE) return true;
  return /^[A-Z]{2}$/.test(c);
}
