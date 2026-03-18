"use client";

import React from "react";
import Link from "next/link";
import { IconDeviceDesktop, IconScreenShare } from "@tabler/icons-react";
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
  format?: "group" | "knockout";
  scorerHref?: string;
  liveHref?: string;
  liveEnabled?: boolean;
}

function useFilteredTabs(
  tabs: TournamentTab[],
  userClubRole: UserClubRole,
  format?: string
) {
  return tabs.filter((tab) => {
    const isAdminTab = tab.value === "admin";
    const canSeeAdminTab = userClubRole === "admin" || userClubRole === "moderator";
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
  format,
  scorerHref,
  liveHref,
  liveEnabled = false,
}: TournamentTabsNavigationProps) {
  const filteredTabs = useFilteredTabs(tabs, userClubRole, format);

  return (
    <div className="sticky top-2 z-30 rounded-2xl border border-border/60 bg-card/92 p-2 shadow-[0_10px_28px_rgba(0,0,0,0.28)] backdrop-blur-xl md:top-3">
      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-0 z-10 w-6 bg-linear-to-r from-card/95 to-transparent" />
        <span className="pointer-events-none absolute inset-y-0 right-0 z-10 w-6 bg-linear-to-l from-card/95 to-transparent" />
        <TabsList className="flex h-auto w-full gap-1.5 overflow-x-auto rounded-xl bg-transparent p-0 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {scorerHref ? (
            <Link
              href={scorerHref}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 snap-start rounded-lg border border-primary/35 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary transition-colors hover:bg-primary/20"
            >
              <span className="flex items-center gap-1.5">
                <IconDeviceDesktop className="h-4 w-4" />
                Scorer
              </span>
            </Link>
          ) : null}
          {liveHref ? (
            liveEnabled ? (
              <Link
                href={liveHref}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 snap-start rounded-lg border border-primary/35 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary transition-colors hover:bg-primary/20"
              >
                <span className="flex items-center gap-1.5">
                  <IconScreenShare className="h-4 w-4" />
                  Live
                </span>
              </Link>
            ) : (
              <button
                type="button"
                disabled
                className="shrink-0 snap-start rounded-lg border border-border/60 bg-muted/25 px-3 py-2 text-xs font-semibold text-muted-foreground opacity-70"
              >
                <span className="flex items-center gap-1.5">
                  <IconScreenShare className="h-4 w-4" />
                  Live
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
                className={cn(
                  "shrink-0 snap-start rounded-lg px-3 py-2 text-xs font-semibold transition-all duration-200",
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
      </div>
    </div>
  );
}
