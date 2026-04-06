export type GeocodeStatus = 'pending' | 'ok' | 'needs_review' | 'failed' | 'manual';

export type LocationSource = 'legacy' | 'user' | 'google' | 'manual' | 'backfill';

export interface StructuredLocation {
  rawInput?: string | null;
  formattedAddress?: string | null;
  addressLine1?: string | null;
  city?: string | null;
  postalCode?: string | null;
  country?: string | null;
  placeId?: string | null;
  lat?: number | null;
  lng?: number | null;
  geocodeStatus?: GeocodeStatus;
  geocodeUpdatedAt?: Date | null;
  lastRequestedAt?: Date | null;
  source?: LocationSource;
  previewImage?: string | null;
}

export const hasValidCoordinates = (location?: StructuredLocation | null): boolean =>
  typeof location?.lat === 'number' &&
  typeof location?.lng === 'number' &&
  Number.isFinite(location.lat) &&
  Number.isFinite(location.lng);

export const shouldPromptLocationReview = (
  location?: StructuredLocation | null,
  fallbackRawLocation?: string | null
): boolean => {
  const hasFallbackInput = Boolean((fallbackRawLocation || '').trim());
  if (!location) return hasFallbackInput;
  if (hasValidCoordinates(location)) return false;

  return location.geocodeStatus === 'needs_review' || location.geocodeStatus === 'failed';
};
