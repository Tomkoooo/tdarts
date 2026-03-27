import {
  getLocaleFromHref,
  getLocaleFromPathname,
  getSavedLocaleFromCookieHeader,
  getLocalePromptSessionKey,
  resolvePreferredLocale,
  shouldPromptLocaleMismatch,
} from "@/lib/locale-mismatch";

describe("locale-mismatch lib", () => {
  const locales = ["hu", "en", "de"] as const;

  describe("getLocaleFromPathname", () => {
    it("extracts locale from pathname prefix", () => {
      expect(getLocaleFromPathname("/hu/tournaments/abc", locales)).toBe("hu");
      expect(getLocaleFromPathname("/en", locales)).toBe("en");
    });

    it("returns null when pathname has no supported locale", () => {
      expect(getLocaleFromPathname("/fr/tournaments/abc", locales)).toBeNull();
      expect(getLocaleFromPathname("/tournaments/abc", locales)).toBeNull();
    });
  });

  describe("getLocaleFromHref", () => {
    it("extracts locale from same-origin href", () => {
      expect(getLocaleFromHref("https://tdarts.hu/en/tournaments/abc", "https://tdarts.hu/hu/home", locales)).toBe("en");
      expect(getLocaleFromHref("/de/search", "https://tdarts.hu/hu/home", locales)).toBe("de");
    });

    it("returns null for unsupported locale and invalid href", () => {
      expect(getLocaleFromHref("/fr/search", "https://tdarts.hu/hu/home", locales)).toBeNull();
      expect(getLocaleFromHref("javascript:void(0)", "https://tdarts.hu/hu/home", locales)).toBeNull();
    });
  });

  describe("getSavedLocaleFromCookieHeader", () => {
    it("reads NEXT_LOCALE first", () => {
      expect(getSavedLocaleFromCookieHeader("foo=bar; NEXT_LOCALE=en; token=abc", locales)).toBe("en");
    });

    it("falls back to locale cookie alias", () => {
      expect(getSavedLocaleFromCookieHeader("locale=de; foo=bar", locales)).toBe("de");
    });

    it("returns null for missing/unsupported locale cookie", () => {
      expect(getSavedLocaleFromCookieHeader("foo=bar; NEXT_LOCALE=fr", locales)).toBeNull();
      expect(getSavedLocaleFromCookieHeader("", locales)).toBeNull();
    });
  });

  describe("shouldPromptLocaleMismatch", () => {
    it("prompts only when saved locale differs from path locale", () => {
      expect(
        shouldPromptLocaleMismatch({
          pathnameLocale: "hu",
          savedLocale: "en",
          hasSessionDismissal: false,
        })
      ).toBe(true);
    });

    it("does not prompt when locale is same or unknown", () => {
      expect(
        shouldPromptLocaleMismatch({
          pathnameLocale: "en",
          savedLocale: "en",
          hasSessionDismissal: false,
        })
      ).toBe(false);
      expect(
        shouldPromptLocaleMismatch({
          pathnameLocale: "en",
          savedLocale: null,
          hasSessionDismissal: false,
        })
      ).toBe(false);
      expect(
        shouldPromptLocaleMismatch({
          pathnameLocale: null,
          savedLocale: "hu",
          hasSessionDismissal: false,
        })
      ).toBe(false);
    });

    it("does not prompt when mismatch was dismissed in this session", () => {
      expect(
        shouldPromptLocaleMismatch({
          pathnameLocale: "de",
          savedLocale: "hu",
          hasSessionDismissal: true,
        })
      ).toBe(false);
    });
  });

  describe("getLocalePromptSessionKey", () => {
    it("builds stable suppression keys", () => {
      expect(getLocalePromptSessionKey("en", "hu")).toBe("localePromptDismissed:en:hu");
    });
  });

  describe("resolvePreferredLocale", () => {
    it("prefers persisted locale over cookie and current", () => {
      expect(
        resolvePreferredLocale({
          cookieLocale: "en",
          persistedLocale: "hu",
          currentLocale: "de",
        })
      ).toBe("hu");
    });

    it("falls back to persisted locale when cookie missing", () => {
      expect(
        resolvePreferredLocale({
          cookieLocale: null,
          persistedLocale: "hu",
          currentLocale: "de",
        })
      ).toBe("hu");
    });

    it("falls back to current locale when cookie and persisted missing", () => {
      expect(
        resolvePreferredLocale({
          cookieLocale: null,
          persistedLocale: null,
          currentLocale: "de",
        })
      ).toBe("de");
    });
  });
});
