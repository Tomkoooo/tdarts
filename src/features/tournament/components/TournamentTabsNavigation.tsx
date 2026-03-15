"use client";

import React from "react";
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
}: TournamentTabsNavigationProps) {
  const filteredTabs = useFilteredTabs(tabs, userClubRole, format);

  return (
    <>
      <div className="bg-card/80 border border-border/60 backdrop-blur-xl top-20 sticky z-50 rounded-xl p-1 shadow-lg">
        <TabsList className="hidden w-full gap-2 bg-transparent p-0 md:flex">
          {filteredTabs.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="flex-1 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-colors data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:hover:bg-primary data-[state=active]:hover:text-primary-foreground hover:bg-muted/20 hover:text-foreground"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
      <div className="md:hidden">
        <div className="fixed bottom-6 left-1/2 z-40 flex w-[calc(100%-1rem)] max-w-[380px] -translate-x-1/2 items-center gap-0.5 rounded-2xl bg-card/85 backdrop-blur-xl p-1 shadow-lg shadow-black/30">
          {filteredTabs.map((tab) => {
            const isActive = activeTab === tab.value;
            const isAdmin = tab.value === "admin";
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => onTabChange(tab.value)}
                className={cn(
                  "flex flex-1 items-center justify-center rounded-xl px-2 py-2 text-xs font-medium transition-all duration-200",
                  isActive
                    ? "bg-primary text-primary-foreground animate-in fade-in-0 zoom-in-95"
                    : "text-muted-foreground hover:bg-muted/20"
                )}
              >
                {isAdmin ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                ) : (
                  tab.label
                )}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
