import { localePath, type SupportedLocale } from '@/lib/seo';

export function clubTournamentsPath(clubId: string): string {
  return `/clubs/${clubId}?page=tournaments`;
}

export function clubSelectedTournamentsShortPath(token: string): string {
  return `/s/${token}`;
}

/** Absolute public club URL with locale prefix (matches sitemap / metadata). */
export function buildClubPublicShareLink(origin: string, locale: SupportedLocale, clubId: string): string {
  const trimmed = origin.replace(/\/$/, '');
  return `${trimmed}${localePath(clubTournamentsPath(clubId), locale)}`;
}

/** Login entry with redirect to locale-prefixed club page. */
export function buildClubLoginRedirectShareLink(
  origin: string,
  locale: SupportedLocale,
  clubId: string
): string {
  const trimmed = origin.replace(/\/$/, '');
  const dest = localePath(clubTournamentsPath(clubId), locale);
  const login = localePath('/auth/login', locale);
  return `${trimmed}${login}?redirect=${encodeURIComponent(dest)}`;
}

/** Short locale-prefixed link that later resolves selected tournaments. */
export function buildClubSelectedTournamentsShortShareLink(
  origin: string,
  locale: SupportedLocale,
  token: string
): string {
  const trimmed = origin.replace(/\/$/, '');
  return `${trimmed}${localePath(clubSelectedTournamentsShortPath(token), locale)}`;
}
