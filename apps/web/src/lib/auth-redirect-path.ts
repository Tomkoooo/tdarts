import { stripLocalePrefix } from '@/lib/seo';

export type OgRedirectTarget =
  | { kind: 'tournament'; code: string }
  | { kind: 'club'; clubId: string };

/**
 * First safe redirect/callback value: same-origin only, no javascript/data URLs.
 */
export function extractSafeRedirectPath(
  rawRedirect: string | string[] | undefined,
  rawCallback: string | string[] | undefined,
  baseUrl: string
): string | null {
  const pick = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const raw = pick(rawRedirect) ?? pick(rawCallback);
  if (!raw || typeof raw !== 'string') return null;

  let s = raw.trim();
  try {
    s = decodeURIComponent(s);
  } catch {
    return null;
  }

  if (/^(javascript:|data:)/i.test(s)) return null;
  if (s.startsWith('//')) return null;

  let base: URL;
  try {
    base = new URL(baseUrl);
  } catch {
    return null;
  }

  if (s.startsWith('http://') || s.startsWith('https://')) {
    try {
      const u = new URL(s);
      if (u.origin !== base.origin) return null;
      return u.pathname + (u.search || '');
    } catch {
      return null;
    }
  }

  const pathPart = s.startsWith('/') ? s : `/${s}`;
  if (pathPart.includes('\\')) return null;
  return pathPart;
}

/**
 * Path without locale prefix, e.g. /tournaments/ABC or /clubs/id?page=1
 */
export function parseOgTargetFromStrippedPath(strippedPath: string): OgRedirectTarget | null {
  const pathOnly = (strippedPath.split('?')[0] || '').trim();
  const normalized =
    pathOnly.length > 1 && pathOnly.endsWith('/') ? pathOnly.slice(0, -1) : pathOnly;

  const tournamentMatch = normalized.match(/^\/tournaments\/([^/]+)(?:\/(live|tv))?$/);
  if (tournamentMatch) {
    return { kind: 'tournament', code: tournamentMatch[1] };
  }

  const clubMatch = normalized.match(/^\/clubs\/([^/]+)/);
  if (clubMatch) {
    return { kind: 'club', clubId: clubMatch[1] };
  }

  return null;
}

export function resolveOgTargetFromSearchParams(
  params: { redirect?: string | string[]; callbackUrl?: string | string[] },
  baseUrl: string
): OgRedirectTarget | null {
  const path = extractSafeRedirectPath(params.redirect, params.callbackUrl, baseUrl);
  if (!path) return null;
  const stripped = stripLocalePrefix(path);
  return parseOgTargetFromStrippedPath(stripped);
}
