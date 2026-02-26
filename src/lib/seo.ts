export const SUPPORTED_LOCALES = ['hu', 'en', 'de'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: SupportedLocale = 'hu';

export const getBaseUrl = () => process.env.NEXT_PUBLIC_BASE_URL || 'https://tdarts.hu';

export const stripLocalePrefix = (pathname: string): string => {
  const normalizedPath = pathname.startsWith('/') ? pathname : `/${pathname}`;
  const parts = normalizedPath.split('/').filter(Boolean);

  if (parts.length > 0 && SUPPORTED_LOCALES.includes(parts[0] as SupportedLocale)) {
    const withoutLocale = `/${parts.slice(1).join('/')}`;
    return withoutLocale === '/' ? '/' : withoutLocale;
  }

  return normalizedPath;
};

export const localePath = (pathname: string, locale: SupportedLocale): string => {
  const normalizedPath = stripLocalePrefix(pathname);
  if (normalizedPath === '/') {
    return `/${locale}`;
  }
  return `/${locale}${normalizedPath}`;
};

export const buildLocaleAlternates = (pathname: string): Record<SupportedLocale, string> => {
  return SUPPORTED_LOCALES.reduce(
    (acc, locale) => {
      acc[locale] = localePath(pathname, locale);
      return acc;
    },
    {} as Record<SupportedLocale, string>
  );
};
