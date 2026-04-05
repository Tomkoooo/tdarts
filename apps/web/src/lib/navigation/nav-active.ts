type NavLikeItem = {
  href: string;
  match?: (path: string, searchParams: URLSearchParams) => boolean;
};

export function matchesMyClubRoute(path: string): boolean {
  return path.startsWith("/myclub") || path.startsWith("/clubs");
}

export function isSegmentActive(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  return pathname.startsWith(`${href}/`);
}

export function findActiveNavIndex(
  navItems: NavLikeItem[],
  normalizedPath: string,
  searchParams: URLSearchParams,
): number | null {
  const index = navItems.findIndex((item) => {
    if (item.match) return item.match(normalizedPath, searchParams);
    const hrefPath = item.href.split("?")[0];
    if (hrefPath === "/") return normalizedPath === "/" || normalizedPath === "";
    return normalizedPath.startsWith(hrefPath);
  });
  return index >= 0 ? index : null;
}
