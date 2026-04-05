/**
 * Shared Open Graph image paths and pickers (club hero → logo → landing logo → app default).
 */

/** Exists in public/; use until a dedicated 1200×630 asset is added. */
export const DEFAULT_OG_PATH = '/android-chrome-512x512.png';

export const DEFAULT_OG_IMAGE_WIDTH = 512;
export const DEFAULT_OG_IMAGE_HEIGHT = 512;

const CUSTOM_OG_WIDTH = 1200;
const CUSTOM_OG_HEIGHT = 630;

export type ClubOgLike = {
  logo?: string;
  landingPage?: {
    coverImage?: string;
    logo?: string;
  };
};

export function toAbsoluteImageUrl(path: string | undefined, baseUrl: string): string {
  const trimmedBase = baseUrl.replace(/\/$/, '');
  if (!path) {
    return `${trimmedBase}${DEFAULT_OG_PATH}`;
  }
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${trimmedBase}${p}`;
}

export function pickClubOgImagePath(club: ClubOgLike | null | undefined): string {
  const lp = club?.landingPage;
  return lp?.coverImage || club?.logo || lp?.logo || DEFAULT_OG_PATH;
}

export function pickTournamentOgImagePath(
  tournamentSettings: { coverImage?: string } | null | undefined,
  club: ClubOgLike | null | undefined
): string {
  const cover = tournamentSettings?.coverImage;
  if (cover) return cover;
  return pickClubOgImagePath(club);
}

export function ogImageDimensionsForPath(imagePath: string): { width: number; height: number } {
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return { width: CUSTOM_OG_WIDTH, height: CUSTOM_OG_HEIGHT };
  }
  if (imagePath === DEFAULT_OG_PATH) {
    return { width: DEFAULT_OG_IMAGE_WIDTH, height: DEFAULT_OG_IMAGE_HEIGHT };
  }
  return { width: CUSTOM_OG_WIDTH, height: CUSTOM_OG_HEIGHT };
}
