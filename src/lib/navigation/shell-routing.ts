/**
 * Centralized shell routing classifier.
 * Single source of truth for which layout/shell to render per path.
 * Used by both server (layout.tsx) and client (NavbarProvider) to avoid hydration mismatch.
 */

export type ShellType = "marketing" | "auth" | "app" | "immersive" | "admin";

const IMMERSIVE_PREFIXES = ["/board", "/test", "/tv", "/api/admin"] as const;
const AUTH_PREFIX = "/auth";
const ADMIN_PREFIX = "/admin";

const MARKETING_PATHS = ["/", "/landing", "/how-it-works"] as const;

/**
 * Classifies a path (locale-stripped) into a shell type.
 * Marketing paths use full-width layout (no sidebar). App paths use sidebar + bottom nav.
 * @param path - Path without locale prefix, e.g. "/auth/login" or "/tournaments/ABC1"
 */
export function classifyPath(path: string): ShellType {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const trimmed = normalized.replace(/\/$/, "") || "/";

  if (IMMERSIVE_PREFIXES.some((p) => trimmed.startsWith(p) || trimmed.includes("/tv"))) {
    return "immersive";
  }
  if (trimmed.startsWith(ADMIN_PREFIX)) {
    return "admin";
  }
  if (trimmed.startsWith(AUTH_PREFIX)) {
    return "auth";
  }
  if (MARKETING_PATHS.includes(trimmed as (typeof MARKETING_PATHS)[number])) {
    return "marketing";
  }
  return "app";
}

/**
 * Whether the path should hide all global navigation (immersive fullscreen or admin with own layout).
 */
export function shouldHideNavbar(path: string): boolean {
  const shell = classifyPath(path);
  return shell === "immersive" || shell === "admin";
}

/**
 * Whether the path should use the app shell (sidebar + bottom nav).
 * Admin has its own layout and does not use the global app shell.
 * Marketing paths use full-width layout without sidebar.
 */
export function shouldUseAppShell(path: string): boolean {
  return classifyPath(path) === "app";
}

/**
 * Whether the path should use the marketing shell (full-width, no sidebar).
 */
export function shouldUseMarketingShell(path: string): boolean {
  return classifyPath(path) === "marketing";
}

/**
 * Whether the path should use the auth shell (minimal, centered, no app nav).
 */
export function shouldUseAuthShell(path: string): boolean {
  return classifyPath(path) === "auth";
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
