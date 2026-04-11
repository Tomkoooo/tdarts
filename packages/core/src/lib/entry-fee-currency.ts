/**
 * ISO 4217 codes for common EU / regional currencies used for tournament entry fees.
 * Default is HUF (Hungarian forint).
 */
export const ENTRY_FEE_CURRENCY_CODES = [
  'HUF',
  'EUR',
  'CZK',
  'DKK',
  'PLN',
  'RON',
  'BGN',
  'SEK',
] as const;

export type EntryFeeCurrency = (typeof ENTRY_FEE_CURRENCY_CODES)[number];

export const DEFAULT_ENTRY_FEE_CURRENCY: EntryFeeCurrency = 'HUF';

export function isEntryFeeCurrency(value: unknown): value is EntryFeeCurrency {
  return (
    typeof value === 'string' &&
    (ENTRY_FEE_CURRENCY_CODES as readonly string[]).includes(value)
  );
}

export function normalizeEntryFeeCurrency(value: unknown): EntryFeeCurrency {
  return isEntryFeeCurrency(value) ? value : DEFAULT_ENTRY_FEE_CURRENCY;
}
