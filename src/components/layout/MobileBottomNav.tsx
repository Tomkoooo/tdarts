"use client";

import React from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  IconDeviceDesktop,
  IconHome,
  IconSearch,
  IconTrophy,
  IconUser,
  IconUsersGroup,
} from "@tabler/icons-react";
import { stripLocalePrefix } from "@/lib/seo";
import { cn } from "@/lib/utils";
import { useUnreadTickets } from "@/hooks/useUnreadTickets";
import { useUserContext } from "@/hooks/useUser";
import { Badge } from "@/components/ui/Badge";
import { Link } from "@/i18n/routing";
import { useOngoingTournamentQuickLink } from "@/features/navigation/hooks/useOngoingTournamentQuickLink";

interface NavItem {
  id: string;
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  match?: (path: string, searchParams: URLSearchParams) => boolean;
}

export const MobileBottomNav: React.FC = () => {
  const { user } = useUserContext();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { unreadCount } = useUnreadTickets({ enabled: Boolean(user?._id) });
  const { ongoingTournament } = useOngoingTournamentQuickLink(user?._id);
  const hasQuickTournament = Boolean(ongoingTournament?.code);

  const normalizedPath = stripLocalePrefix(pathname);

  const navItems = React.useMemo<NavItem[]>(
    () => [
      {
        id: "home",
        href: "/",
        icon: IconHome,
        label: "Home",
        match: (path) => path === "/" || path === "/home" || path === "/landing",
      },
      {
        id: "tournaments",
        href: "/search",
        icon: IconSearch,
        label: "Versenyek",
        match: (path) => path === "/search",
      },
      {
        id: "board",
        href: ongoingTournament?.code ? `/tournaments/${ongoingTournament.code}` : "/board",
        icon: hasQuickTournament ? IconTrophy : IconDeviceDesktop,
        label: hasQuickTournament ? "Current tournament" : "Tábla",
        match: (path) => path.startsWith("/board") || path.startsWith("/tournaments"),
      },
      {
        id: "profile",
        href: "/profile",
        icon: IconUser,
        label: "Profil",
      },
      {
        id: "myclub",
        href: "/myclub",
        icon: IconUsersGroup,
        label: "Saját klub",
        match: (path) => path.startsWith("/myclub") || path.startsWith("/clubs"),
      },
    ],
    [hasQuickTournament, ongoingTournament?.code]
  );

  const isActive = (item: NavItem): boolean => {
    if (item.match) return item.match(normalizedPath, searchParams);
    const hrefPath = item.href.split("?")[0];
    if (hrefPath === "/") return normalizedPath === "/" || normalizedPath === "";
    return normalizedPath.startsWith(hrefPath);
  };

  const activeIndex = React.useMemo(() => {
    const index = navItems.findIndex((item) => isActive(item));
    return index >= 0 ? index : 0;
  }, [navItems, normalizedPath, searchParams]);

  const slotPercent = 100 / navItems.length;

  const bubbleStyle = {
    left: `calc(${slotPercent * activeIndex}% + ${slotPercent / 2}% - 1.75rem)`,
  };

  const notchStyle = {
    left: `calc(${slotPercent * activeIndex}% + ${slotPercent / 2}% - 2.5rem)`,
  };

  return (
    <nav
      className={cn(
        "fixed inset-x-0 bottom-0 z-50 md:hidden",
        "bg-background/45 backdrop-blur-[2px]",
        "pb-[calc(env(safe-area-inset-bottom)+0.35rem)]"
      )}
    >
      <div className="mx-auto w-full max-w-md px-3">
        <div
          className={cn(
            "relative h-[4.35rem] rounded-[1.15rem] border border-border/70",
            "bg-linear-to-b from-card/90 to-card/70 backdrop-blur-xl",
            "shadow-[0_8px_26px_rgba(0,0,0,0.32)]"
          )}
        >
          <span
            className="pointer-events-none absolute -top-4 h-8 w-20 rounded-b-[999px] border-b border-border/60 bg-card/95 transition-all duration-500 ease-out"
            style={notchStyle}
          />
          <span
            className="pointer-events-none absolute -top-6 h-14 w-14 rounded-full border-2 border-primary/35 bg-primary text-primary-foreground shadow-[0_10px_22px_rgba(146,34,16,0.45)] transition-all duration-500 ease-out"
            style={bubbleStyle}
          />

          <div
            className="grid h-full"
            style={{ gridTemplateColumns: `repeat(${navItems.length}, minmax(0, 1fr))` }}
          >
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item);
              const showProfileBadge = item.href === "/profile" && unreadCount > 0;
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={cn(
                    "group relative flex h-full flex-col items-center justify-center gap-1 rounded-xl px-1",
                    "transition-all duration-500 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
                    active ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  <div
                    className={cn(
                      "relative z-10 flex h-8 w-8 items-center justify-center rounded-full transition-all duration-500 ease-out",
                      active ? "-translate-y-4 scale-110 text-primary-foreground" : "translate-y-0 scale-100"
                    )}
                  >
                    <Icon size={18} />
                    {showProfileBadge ? (
                      <Badge className="absolute -right-3 -top-2 h-5 min-w-5 px-1 text-[10px]">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </Badge>
                    ) : null}
                  </div>
                  <span
                    className={cn(
                      "truncate text-[11px] font-semibold transition-all duration-500 ease-out",
                      active ? "translate-y-1 scale-105 text-primary" : "translate-y-0 scale-95 opacity-80"
                    )}
                  >
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
};
