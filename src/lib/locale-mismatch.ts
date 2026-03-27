export type SupportedLocale = "hu" | "en" | "de";

type SupportedLocales = readonly SupportedLocale[];

const LOCALE_COOKIE_KEYS = ["NEXT_LOCALE", "locale"] as const;

export function getLocaleFromPathname(pathname: string, locales: SupportedLocales): SupportedLocale | null {
  const firstSegment = pathname.split("/").filter(Boolean)[0];
  if (!firstSegment) {
    return null;
  }

  return isSupportedLocale(firstSegment, locales) ? firstSegment : null;
}

export function getLocaleFromHref(
  href: string,
  currentUrl: string,
  locales: SupportedLocales
): SupportedLocale | null {
  try {
    const url = new URL(href, currentUrl);
    return getLocaleFromPathname(url.pathname, locales);
  } catch {
    return null;
  }
}

export function getSavedLocaleFromCookieHeader(
  cookieHeader: string,
  locales: SupportedLocales
): SupportedLocale | null {
  const cookieMap = parseCookieHeader(cookieHeader);

  for (const key of LOCALE_COOKIE_KEYS) {
    const rawValue = cookieMap.get(key);
    if (!rawValue) {
      continue;
    }

    if (isSupportedLocale(rawValue, locales)) {
      return rawValue;
    }
  }

  return null;
}

export function getLocalePromptSessionKey(savedLocale: SupportedLocale, pathnameLocale: SupportedLocale): string {
  return `localePromptDismissed:${savedLocale}:${pathnameLocale}`;
}

export function resolvePreferredLocale(input: {
  cookieLocale: SupportedLocale | null;
  persistedLocale: SupportedLocale | null;
  currentLocale: SupportedLocale | null;
}): SupportedLocale | null {
  if (input.persistedLocale) {
    return input.persistedLocale;
  }
  if (input.cookieLocale) {
    return input.cookieLocale;
  }
  return input.currentLocale;
}

export function shouldPromptLocaleMismatch(input: {
  pathnameLocale: SupportedLocale | null;
  savedLocale: SupportedLocale | null;
  hasSessionDismissal: boolean;
}): boolean {
  if (!input.pathnameLocale || !input.savedLocale) {
    return false;
  }

  if (input.pathnameLocale === input.savedLocale) {
    return false;
  }

  return !input.hasSessionDismissal;
}

function parseCookieHeader(cookieHeader: string): Map<string, string> {
  const result = new Map<string, string>();
  for (const pair of cookieHeader.split(";")) {
    const [rawKey, ...rawRest] = pair.split("=");
    const key = rawKey?.trim();
    if (!key) {
      continue;
    }
    result.set(key, rawRest.join("=").trim());
  }
  return result;
}

function isSupportedLocale(value: string, locales: SupportedLocales): value is SupportedLocale {
  return locales.includes(value as SupportedLocale);
}
