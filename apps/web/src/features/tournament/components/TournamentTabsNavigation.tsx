"use client";

import React from "react";
import Link from "next/link";
import { IconChevronLeft, IconChevronRight, IconDeviceDesktop, IconScreenShare } from "@tabler/icons-react";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export interface TournamentTab {
  value: string;
  label: string;
}

type UserClubRole = "admin" | "moderator" | "member" | "none";

interface TournamentTabsNavigationProps {
  tabs: TournamentTab[];
  activeTab: string;
  onTabChange: (value: string) => void;
  userClubRole: UserClubRole;
  isGlobalAdmin?: boolean;
  format?: "group" | "knockout";
  scorerHref?: string;
  scorerLabel?: string;
  liveHref?: string;
  liveLabel?: string;
  liveEnabled?: boolean;
  mobileActionRow?: boolean;
}

function useFilteredTabs(
  tabs: TournamentTab[],
  userClubRole: UserClubRole,
  isGlobalAdmin: boolean,
  format?: string
) {
  return tabs.filter((tab) => {
    const isAdminTab = tab.value === "admin";
    const canSeeAdminTab = userClubRole === "admin" || userClubRole === "moderator" || isGlobalAdmin;
    if (isAdminTab && !canSeeAdminTab) return false;
    if (tab.value === "groups" && format === "knockout") return false;
    if (tab.value === "bracket" && format === "group") return false;
    return true;
  });
}

export function TournamentTabsNavigation({
  tabs,
  activeTab,
  onTabChange,
  userClubRole,
  isGlobalAdmin = false,
  format,
  scorerHref,
  scorerLabel = "Scorer",
  liveHref,
  liveLabel = "Live",
  liveEnabled = false,
  mobileActionRow = false,
}: TournamentTabsNavigationProps) {
  const filteredTabs = useFilteredTabs(tabs, userClubRole, isGlobalAdmin, format);
  const tabsListRef = React.useRef<HTMLDivElement | null>(null);
  const [scrollState, setScrollState] = React.useState({
    canScrollLeft: false,
    canScrollRight: false,
  });

  const syncScrollState = React.useCallback(() => {
    const element = tabsListRef.current;
    if (!element) return;
    const { scrollLeft, scrollWidth, clientWidth } = element;
    const canScrollLeft = scrollLeft > 8;
    const canScrollRight = scrollLeft + clientWidth < scrollWidth - 8;
    setScrollState((prev) =>
      prev.canScrollLeft === canScrollLeft && prev.canScrollRight === canScrollRight
        ? prev
        : { canScrollLeft, canScrollRight }
    );
  }, []);

  React.useEffect(() => {
    syncScrollState();
    const element = tabsListRef.current;
    if (!element) return;
    element.addEventListener("scroll", syncScrollState, { passive: true });
    window.addEventListener("resize", syncScrollState);
    return () => {
      element.removeEventListener("scroll", syncScrollState);
      window.removeEventListener("resize", syncScrollState);
    };
  }, [syncScrollState, tabs.length, filteredTabs.length, scorerHref, liveHref, liveEnabled]);

  const shouldShowDesktopPills = Boolean(scorerHref || liveHref);
  const showDesktopPills = shouldShowDesktopPills && !mobileActionRow;

  return (
    <div className="sticky top-16 z-40 md:top-20">
      <div className="relative rounded-2xl border border-border/60 bg-card p-2.5 shadow-[0_10px_28px_rgba(0,0,0,0.28)] md:bg-card/92 md:p-2 md:backdrop-blur-xl">
        <span
          className={cn(
            "pointer-events-none absolute inset-y-0 left-0 z-10 w-7 bg-linear-to-r from-card/95 to-transparent transition-opacity md:w-6",
            scrollState.canScrollLeft ? "opacity-100" : "opacity-0"
          )}
        />
        <span
          className={cn(
            "pointer-events-none absolute inset-y-0 right-0 z-10 w-7 bg-linear-to-l from-card/95 to-transparent transition-opacity md:w-6",
            scrollState.canScrollRight ? "opacity-100" : "opacity-0"
          )}
        />
        <span
          className={cn(
            "pointer-events-none absolute left-1 top-1/2 z-20 -translate-y-1/2 rounded-full border border-border/60 bg-card/85 p-0.5 text-muted-foreground transition-opacity md:hidden",
            scrollState.canScrollLeft ? "opacity-100" : "opacity-0"
          )}
          aria-hidden
        >
          <IconChevronLeft className="h-3.5 w-3.5" />
        </span>
        <span
          className={cn(
            "pointer-events-none absolute right-1 top-1/2 z-20 -translate-y-1/2 rounded-full border border-border/60 bg-card/85 p-0.5 text-muted-foreground transition-opacity md:hidden",
            scrollState.canScrollRight ? "opacity-100 animate-pulse" : "opacity-0"
          )}
          aria-hidden
        >
          <IconChevronRight className="h-3.5 w-3.5" />
        </span>
        <TabsList
          ref={tabsListRef}
          className="flex h-auto w-full justify-start gap-1.5 overflow-x-auto rounded-xl bg-transparent px-4 py-0 md:px-0 md:justify-center [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden [scroll-padding-left:1rem] [scroll-padding-right:1rem] p-0"
        >
          {showDesktopPills && scorerHref ? (
            <Link
              href={scorerHref}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 snap-start rounded-lg border border-primary/55 bg-primary px-3.5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              aria-label="Open scorer"
            >
              <span className="flex items-center gap-1.5">
                <IconDeviceDesktop className="h-4 w-4" />
                {scorerLabel}
              </span>
            </Link>
          ) : null}
          {showDesktopPills && liveHref ? (
            liveEnabled ? (
              <Link
                href={liveHref}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 snap-start rounded-lg border border-primary/35 bg-primary/10 px-3.5 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/20"
              >
                <span className="flex items-center gap-1.5">
                  <IconScreenShare className="h-4 w-4" />
                  {liveLabel}
                </span>
              </Link>
            ) : (
              <button
                type="button"
                disabled
                className="shrink-0 snap-start rounded-lg border border-border/60 bg-muted/25 px-3.5 py-2.5 text-sm font-semibold text-muted-foreground opacity-70"
              >
                <span className="flex items-center gap-1.5">
                  <IconScreenShare className="h-4 w-4" />
                  {liveLabel}
                </span>
              </button>
            )
          ) : null}
          {filteredTabs.map((tab) => {
            const isActive = activeTab === tab.value;
            return (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                onClick={() => onTabChange(tab.value)}
                data-tab={tab.value}
                className={cn(
                  "shrink-0 snap-start rounded-lg px-3.5 py-2.5 text-sm font-semibold transition-all duration-200",
                  "min-w-[94px] sm:min-w-[108px]",
                  "text-muted-foreground hover:bg-muted/25 hover:text-foreground",
                  isActive && "bg-primary text-primary-foreground"
                )}
              >
                {tab.label}
              </TabsTrigger>
            );
          })}
        </TabsList>
        {mobileActionRow ? (
          <div className="mt-2 grid gap-2 md:hidden">
            {scorerHref ? (
              <Link
                href={scorerHref}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <IconDeviceDesktop className="h-4 w-4" />
                {scorerLabel}
              </Link>
            ) : null}
            {liveHref ? (
              liveEnabled ? (
                <Link
                  href={liveHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-primary/35 bg-primary/10 px-4 text-sm font-semibold text-primary transition-colors hover:bg-primary/20"
                >
                  <IconScreenShare className="h-4 w-4" />
                  {liveLabel}
                </Link>
              ) : (
                <button
                  type="button"
                  disabled
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-border/60 bg-muted/25 px-4 text-sm font-semibold text-muted-foreground opacity-70"
                >
                  <IconScreenShare className="h-4 w-4" />
                  {liveLabel}
                </button>
              )
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
