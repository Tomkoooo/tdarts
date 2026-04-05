import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { ClubService } from '@/database/services/club.service';
import { TournamentService } from '@/database/services/tournament.service';
import {
  DEFAULT_OG_PATH,
  type ClubOgLike,
  ogImageDimensionsForPath,
  pickClubOgImagePath,
  pickTournamentOgImagePath,
  toAbsoluteImageUrl,
} from '@/lib/og-image';
import { resolveOgTargetFromSearchParams } from '@/lib/auth-redirect-path';
import { buildLocaleAlternates, getBaseUrl, localePath, type SupportedLocale } from '@/lib/seo';
import { routing } from '@/i18n/routing';

export type AuthOgVariant = 'login' | 'register' | 'google';

function isSupportedLocale(locale: string): locale is SupportedLocale {
  return routing.locales.includes(locale as SupportedLocale);
}

function ogLocaleForUi(locale: string): string {
  if (locale === 'hu') return 'hu_HU';
  if (locale === 'de') return 'de_DE';
  return 'en_US';
}

function authSegment(variant: AuthOgVariant): string {
  switch (variant) {
    case 'login':
      return '/auth/login';
    case 'register':
      return '/auth/register';
    case 'google':
      return '/auth/callback/google';
    default: {
      const _x: never = variant;
      return _x;
    }
  }
}

function firstQueryValue(v: string | string[] | undefined): string | undefined {
  if (v === undefined) return undefined;
  const s = Array.isArray(v) ? v[0] : v;
  return s && s.trim() ? s : undefined;
}

function sortedQueryFromParams(params: {
  redirect?: string | string[];
  callbackUrl?: string | string[];
}): string {
  const entries: [string, string][] = [];
  const r = firstQueryValue(params.redirect);
  const c = firstQueryValue(params.callbackUrl);
  if (r) entries.push(['redirect', r]);
  if (c) entries.push(['callbackUrl', c]);
  entries.sort(([a], [b]) => a.localeCompare(b));
  if (entries.length === 0) return '';
  return `?${entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&')}`;
}

export async function buildAuthRedirectMetadata(input: {
  locale: string;
  variant: AuthOgVariant;
  searchParams: { redirect?: string | string[]; callbackUrl?: string | string[] };
}): Promise<Metadata> {
  const locale = isSupportedLocale(input.locale) ? input.locale : 'hu';
  const baseUrl = getBaseUrl().replace(/\/$/, '');
  const metaT = await getTranslations({ locale, namespace: 'Metadata' });
  const segment = authSegment(input.variant);
  const localizedAuthPath = localePath(segment, locale);
  const query = sortedQueryFromParams(input.searchParams);
  const pageUrl = `${baseUrl}${localizedAuthPath}${query}`;
  const ogLoc = ogLocaleForUi(locale);

  let variantTitle: string;
  switch (input.variant) {
    case 'login': {
      const t = await getTranslations({ locale, namespace: 'Auth.login' });
      variantTitle = t('title');
      break;
    }
    case 'register': {
      const t = await getTranslations({ locale, namespace: 'Auth.register' });
      variantTitle = t('title');
      break;
    }
    case 'google': {
      const t = await getTranslations({ locale, namespace: 'Auth.googleCallback' });
      variantTitle = t('processing');
      break;
    }
    default: {
      const _x: never = input.variant;
      variantTitle = _x;
    }
  }

  const target = resolveOgTargetFromSearchParams(input.searchParams, baseUrl);

  const defaultImagePath = toAbsoluteImageUrl(DEFAULT_OG_PATH, baseUrl);
  const defaultDims = ogImageDimensionsForPath(DEFAULT_OG_PATH);

  if (!target) {
    return {
      title: variantTitle,
      description: metaT('description'),
      robots: { index: false, follow: true },
      metadataBase: new URL(baseUrl),
      alternates: { canonical: pageUrl },
      openGraph: {
        title: variantTitle,
        description: metaT('description'),
        url: pageUrl,
        type: 'website',
        siteName: 'tDarts',
        locale: ogLoc,
        images: [
          {
            url: defaultImagePath,
            width: defaultDims.width,
            height: defaultDims.height,
            alt: metaT('og_title'),
          },
        ],
      },
      twitter: {
        card: 'summary_large_image',
        title: variantTitle,
        description: metaT('twitter_description'),
        images: [defaultImagePath],
      },
    };
  }

  try {
    if (target.kind === 'club') {
      const club = await ClubService.getClubMetadataTheme(target.clubId);
      const name = club.name || 'Darts Klub';
      const title = club.landingPage?.seo?.title || name;
      const description =
        club.landingPage?.seo?.description ||
        club.description ||
        `Részletek a(z) ${name} darts klubról.`;
      const imagePath = pickClubOgImagePath(club);
      const imageUrl = toAbsoluteImageUrl(imagePath, baseUrl);
      const { width, height } = ogImageDimensionsForPath(imagePath);
      const clubPath = `/clubs/${target.clubId}`;
      const localeAlternates = buildLocaleAlternates(clubPath);
      const destCanonical = `${baseUrl}${localePath(clubPath, locale)}`;

      return {
        title: `${title} — ${variantTitle}`,
        description,
        robots: { index: false, follow: true },
        metadataBase: new URL(baseUrl),
        alternates: {
          canonical: pageUrl,
          languages: {
            ...Object.fromEntries(
              Object.entries(localeAlternates).map(([loc, path]) => [loc, `${baseUrl}${path}`])
            ),
            'x-default': `${baseUrl}${localePath(clubPath, 'hu')}`,
          },
        },
        openGraph: {
          title: title,
          description,
          url: pageUrl,
          type: 'website',
          siteName: 'tDarts',
          locale: ogLoc,
          images: [{ url: imageUrl, width, height, alt: title }],
        },
        twitter: {
          card: 'summary_large_image',
          title,
          description,
          images: [imageUrl],
        },
        other: {
          'tdarts:destination': destCanonical,
        },
      };
    }

    const tournament = await TournamentService.getTournament(target.code);
    const clubOg: ClubOgLike | undefined =
      tournament.clubId && typeof tournament.clubId === 'object' &&
      ('logo' in tournament.clubId || 'landingPage' in tournament.clubId)
        ? (tournament.clubId as ClubOgLike)
        : undefined;
    const clubDoc =
      tournament.clubId && typeof tournament.clubId === 'object'
        ? (tournament.clubId as { name?: string })
        : undefined;
    const tset = tournament.tournamentSettings || {};
    const name = tset.name || 'Darts Verseny';
    const description =
      tset.description ||
      `Részletek a(z) ${name} darts versenyről. Szervező: ${clubDoc?.name || ''}.`;
    const imagePath = pickTournamentOgImagePath(tset, clubOg);
    const imageUrl = toAbsoluteImageUrl(imagePath, baseUrl);
    const { width, height } = ogImageDimensionsForPath(imagePath);
    const tournamentPath = `/tournaments/${target.code}`;
    const localeAlternates = buildLocaleAlternates(tournamentPath);
    const destCanonical = `${baseUrl}${localePath(tournamentPath, locale)}`;

    return {
      title: `${name} — ${variantTitle}`,
      description,
      robots: { index: false, follow: true },
      metadataBase: new URL(baseUrl),
      alternates: {
        canonical: pageUrl,
        languages: {
          ...Object.fromEntries(
            Object.entries(localeAlternates).map(([loc, path]) => [loc, `${baseUrl}${path}`])
          ),
          'x-default': `${baseUrl}${localePath(tournamentPath, 'hu')}`,
        },
      },
      openGraph: {
        title: name,
        description,
        url: pageUrl,
        type: 'website',
        siteName: 'tDarts',
        locale: ogLoc,
        images: [{ url: imageUrl, width, height, alt: name }],
      },
      twitter: {
        card: 'summary_large_image',
        title: name,
        description,
        images: [imageUrl],
      },
      other: {
        'tdarts:destination': destCanonical,
      },
    };
  } catch {
    return {
      title: variantTitle,
      description: metaT('description'),
      robots: { index: false, follow: true },
      metadataBase: new URL(baseUrl),
      alternates: { canonical: pageUrl },
      openGraph: {
        title: variantTitle,
        description: metaT('description'),
        url: pageUrl,
        type: 'website',
        siteName: 'tDarts',
        locale: ogLoc,
        images: [
          {
            url: defaultImagePath,
            width: defaultDims.width,
            height: defaultDims.height,
            alt: metaT('og_title'),
          },
        ],
      },
      twitter: {
        card: 'summary_large_image',
        title: variantTitle,
        description: metaT('twitter_description'),
        images: [defaultImagePath],
      },
    };
  }
}
