import { INTERNATIONAL_COUNTRY_CODE } from '@tdarts/core/profile-country';

export { INTERNATIONAL_COUNTRY_CODE };

export interface CountryOption {
  value: string;
  label: string;
}

const FALLBACK_COUNTRY_CODES = ['HU', 'DE', 'AT', 'RO', 'SK', 'CZ', 'PL', 'RS', 'HR', 'SI', 'GB', 'US'];

const REGION_CODES: string[] = (() => {
  const intlWithSupportedValues = Intl as Intl.DateTimeFormatOptions & {
    supportedValuesOf?: (key: string) => string[];
  };

  if (typeof intlWithSupportedValues.supportedValuesOf === 'function') {
    try {
      return intlWithSupportedValues
        .supportedValuesOf('region')
        .filter((value) => value.length === 2 && value.toUpperCase() === value);
    } catch {
      // Some runtimes expose supportedValuesOf but do not support "region" key.
      return FALLBACK_COUNTRY_CODES;
    }
  }

  return FALLBACK_COUNTRY_CODES;
})();

const COUNTRY_SET = new Set(REGION_CODES);

export const isValidCountryCode = (code?: string | null): boolean => {
  if (!code) return false;
  const u = code.toUpperCase();
  if (u === INTERNATIONAL_COUNTRY_CODE) return true;
  return COUNTRY_SET.has(u);
};

export const getCountryOptions = (locale: string = 'en'): CountryOption[] => {
  const displayNames = new Intl.DisplayNames([locale], { type: 'region' });

  return REGION_CODES
    .map((countryCode) => ({
      value: countryCode,
      label: displayNames.of(countryCode) || countryCode,
    }))
    .sort((a, b) => a.label.localeCompare(b.label, locale));
};

/** International (XX) first, then alphabetical ISO regions — for onboarding / profile. */
export const getCountryOptionsWithInternational = (
  locale: string = 'en',
  internationalLabel: string,
): CountryOption[] => [
  { value: INTERNATIONAL_COUNTRY_CODE, label: internationalLabel },
  ...getCountryOptions(locale),
];

export const getCountryLabel = (
  countryCode?: string | null,
  locale: string = 'en',
  internationalLabel: string = 'International',
): string => {
  if (!countryCode) return '';
  const normalizedCode = countryCode.toUpperCase();
  if (normalizedCode === INTERNATIONAL_COUNTRY_CODE) return internationalLabel;
  const displayNames = new Intl.DisplayNames([locale], { type: 'region' });
  return displayNames.of(normalizedCode) || normalizedCode;
};

export const getCountryFlagEmoji = (countryCode?: string | null): string => {
  if (!countryCode) return '';
  const normalizedCode = countryCode.trim().toUpperCase();
  if (normalizedCode === INTERNATIONAL_COUNTRY_CODE) return '🌐';
  if (!isValidCountryCode(normalizedCode)) return '';

  // Convert ISO country code letters to regional indicator symbols.
  return normalizedCode
    .split('')
    .map((char) => String.fromCodePoint(127397 + char.charCodeAt(0)))
    .join('');
};
