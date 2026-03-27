import { findActiveNavIndex, isSegmentActive, matchesMyClubRoute } from "@/lib/navigation/nav-active";

describe("nav-active", () => {
  describe("matchesMyClubRoute", () => {
    it("matches both /myclub and /clubs namespaces", () => {
      expect(matchesMyClubRoute("/myclub")).toBe(true);
      expect(matchesMyClubRoute("/myclub/settings")).toBe(true);
      expect(matchesMyClubRoute("/clubs/abc")).toBe(true);
      expect(matchesMyClubRoute("/club/abc")).toBe(false);
    });
  });

  describe("findActiveNavIndex", () => {
    it("returns null when no item matches path", () => {
      const items = [
        { href: "/", match: (path: string) => path === "/" },
        { href: "/search", match: (path: string) => path === "/search" },
      ];

      expect(findActiveNavIndex(items, "/settings", new URLSearchParams())).toBeNull();
    });

    it("returns matching item index when present", () => {
      const items = [
        { href: "/", match: (path: string) => path === "/" },
        { href: "/profile", match: (path: string) => path === "/profile" },
      ];

      expect(findActiveNavIndex(items, "/profile", new URLSearchParams())).toBe(1);
    });
  });

  describe("isSegmentActive", () => {
    it("matches exact and nested segment paths", () => {
      expect(isSegmentActive("/admin/users", "/admin/users")).toBe(true);
      expect(isSegmentActive("/admin/users/123", "/admin/users")).toBe(true);
      expect(isSegmentActive("/admin/usersettings", "/admin/users")).toBe(false);
    });
  });
});
