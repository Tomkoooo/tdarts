import { shouldHideNavbar, shouldShowFooter } from "@/lib/navigation/shell-routing";

describe("shell-routing", () => {
  describe("shouldHideNavbar", () => {
    it("hides navbar on immersive board route", () => {
      expect(shouldHideNavbar("/board/abc123")).toBe(true);
    });

    it("hides navbar on /board when localgame query is true", () => {
      const params = new URLSearchParams("localgame=true");
      expect(shouldHideNavbar("/board", params)).toBe(true);
      expect(shouldHideNavbar("/board/", params)).toBe(true);
    });

    it("does not hide navbar on /board without localgame", () => {
      expect(shouldHideNavbar("/board")).toBe(false);
      expect(shouldHideNavbar("/board", new URLSearchParams(""))).toBe(false);
    });

    it("hides navbar on tournament tv route", () => {
      expect(shouldHideNavbar("/tournaments/ABC/tv")).toBe(true);
      expect(shouldHideNavbar("/tournaments/ABC/tv/slides")).toBe(true);
    });

    it("does not hide navbar on tv-like non-tv route", () => {
      expect(shouldHideNavbar("/tournaments/ABC/tv-special")).toBe(false);
    });

    it("hides navbar on admin routes only", () => {
      expect(shouldHideNavbar("/admin")).toBe(true);
      expect(shouldHideNavbar("/admin/users")).toBe(true);
      expect(shouldHideNavbar("/administrator")).toBe(false);
    });
  });

  describe("shouldShowFooter", () => {
    it("shows footer on exact root pages", () => {
      expect(shouldShowFooter("/")).toBe(true);
      expect(shouldShowFooter("/home")).toBe(true);
    });

    it("shows footer for configured prefixes", () => {
      expect(shouldShowFooter("/profile")).toBe(true);
      expect(shouldShowFooter("/profile/settings")).toBe(true);
      expect(shouldShowFooter("/search/tournaments")).toBe(true);
    });

    it("does not show footer on unrelated routes", () => {
      expect(shouldShowFooter("/tournaments/ABC")).toBe(false);
    });
  });
});
