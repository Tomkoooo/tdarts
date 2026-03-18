/**
 * Global nav should be hidden only on:
 * - board* pages (immersive gameplay)
 * - admin pages (they have their own admin navigation/layout)
 */
export function shouldHideNavbar(path: string): boolean {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const trimmed = normalized.replace(/\/$/, "") || "/";
  const isBoardSubRoute = trimmed.startsWith("/board/");
  return isBoardSubRoute || trimmed.startsWith("/admin");
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
