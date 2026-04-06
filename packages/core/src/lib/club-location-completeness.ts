import { hasValidCoordinates, type StructuredLocation } from '../interfaces/location.interface'

/**
 * Club venue address is "complete" when we have structured fields from geocoding/manual entry,
 * or a sufficiently detailed legacy free-text location.
 */
export function clubHasCorrectAddress(
  structuredLocation?: StructuredLocation | null,
  legacyLocation?: string | null,
  legacyAddress?: string | null,
): boolean {
  const sl = structuredLocation
  if (sl?.formattedAddress?.trim()) return true
  if (sl?.addressLine1?.trim() && sl?.city?.trim()) return true
  const combined = `${legacyLocation || ""} ${legacyAddress || ""}`.trim()
  return combined.length >= 5
}

/** Map-ready: coordinates present and geocode pipeline reports success or manual confirmation. */
export function clubHasGeoLocationSynced(structuredLocation?: StructuredLocation | null): boolean {
  if (!hasValidCoordinates(structuredLocation)) return false
  const status = structuredLocation?.geocodeStatus
  return status === "ok" || status === "manual"
}

export function clubNeedsLocationAttention(
  structuredLocation?: StructuredLocation | null,
  legacyLocation?: string | null,
  legacyAddress?: string | null,
): boolean {
  return (
    !clubHasCorrectAddress(structuredLocation, legacyLocation, legacyAddress) ||
    !clubHasGeoLocationSynced(structuredLocation)
  )
}
