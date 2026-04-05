/** Optional query string (e.g. from `useSearchParams()`) for route-specific shell rules. */
export type ShellSearchParams = { get(name: string): string | null } | null | undefined;

/**
 * Global nav should be hidden only on:
 * - board* pages (immersive gameplay)
 * - standalone /board with ?localgame=true (local match; URL drives shell so layout re-renders)
 * - tournament tv pages (immersive display)
 * - admin pages (they have their own admin navigation/layout)
 */
export function shouldHideNavbar(
  path: string,
  searchParams?: ShellSearchParams,
): boolean {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const trimmed = normalized.replace(/\/$/, "") || "/";
  const isBoardSubRoute = trimmed.startsWith("/board/");
  const isBoardLocalGame =
    trimmed === "/board" && searchParams?.get("localgame") === "true";
  const isAdminSubRoute = trimmed === "/admin" || trimmed.startsWith("/admin/");
  // Strict segment match: /tournaments/:code/tv (and optional trailing sub-routes)
  const isTournamentTvRoute = /^\/tournaments\/[^/]+\/tv(?:\/.*)?$/.test(trimmed);
  return (
    isBoardSubRoute ||
    isBoardLocalGame ||
    isAdminSubRoute ||
    isTournamentTvRoute
  );
}

const FOOTER_EXACT = ["/", "/landing", "/how-it-works", "/home", "/myclub"] as const;
const FOOTER_PREFIXES = ["/search", "/profile", "/club"] as const;

/**
 * Whether to show the footer on the given path.
 */
export function shouldShowFooter(path: string): boolean {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const trimmed = normalized.replace(/\/$/, "") || "/";
  return (
    FOOTER_EXACT.includes(trimmed as (typeof FOOTER_EXACT)[number]) ||
    FOOTER_PREFIXES.some((p) => trimmed === p || trimmed.startsWith(p + "/"))
  );
}
