import {
  clubHasCorrectAddress,
  clubHasGeoLocationSynced,
  clubNeedsLocationAttention,
} from "@/lib/club-location-completeness"

describe("club-location-completeness", () => {
  it("accepts formatted structured address", () => {
    expect(
      clubHasCorrectAddress({ formattedAddress: "Main st 1, City" }, null, null),
    ).toBe(true)
  })

  it("accepts address line + city", () => {
    expect(
      clubHasCorrectAddress({ addressLine1: "Main 1", city: "Budapest" }, "", ""),
    ).toBe(true)
  })

  it("accepts legacy long free-text", () => {
    expect(clubHasCorrectAddress(null, "Budapest, Example street 5", null)).toBe(true)
  })

  it("rejects empty address", () => {
    expect(clubHasCorrectAddress(null, "", "")).toBe(false)
  })

  it("geo synced only with coords and ok|manual status", () => {
    expect(
      clubHasGeoLocationSynced({
        lat: 47.5,
        lng: 19.0,
        geocodeStatus: "ok",
      }),
    ).toBe(true)
    expect(
      clubHasGeoLocationSynced({
        lat: 47.5,
        lng: 19.0,
        geocodeStatus: "manual",
      }),
    ).toBe(true)
    expect(
      clubHasGeoLocationSynced({
        lat: 47.5,
        lng: 19.0,
        geocodeStatus: "pending",
      }),
    ).toBe(false)
    expect(clubHasGeoLocationSynced({ geocodeStatus: "ok" })).toBe(false)
  })

  it("needs attention when geo missing", () => {
    expect(
      clubNeedsLocationAttention(
        { formattedAddress: "X", geocodeStatus: "pending" },
        null,
        null,
      ),
    ).toBe(true)
  })
})
