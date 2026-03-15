"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  IconActivityHeartbeat,
  IconDeviceDesktop,
  IconHome,
  IconSearch,
  IconUser,
  IconUsersGroup,
  IconWorld,
} from "@tabler/icons-react";
import { stripLocalePrefix } from "@/lib/seo";
import { cn } from "@/lib/utils";
import { useUnreadTickets } from "@/hooks/useUnreadTickets";
import { useUserContext } from "@/hooks/useUser";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/Badge";

interface NavItem {
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  highlighted?: boolean;
}

export const MobileBottomNav: React.FC = () => {
  const { user } = useUserContext();
  const pathname = usePathname();
  const t = useTranslations("Navbar");
  const { unreadCount } = useUnreadTickets({ enabled: Boolean(user?._id) });

  const normalizedPath = stripLocalePrefix(pathname);

  const navItems = React.useMemo<NavItem[]>(
    () => [
      { href: user?._id ? "/home" : "/", icon: IconHome, label: t.has("home") ? t("home") : "Home" },
      { href: "/landing", icon: IconWorld, label: t.has("landing") ? t("landing") : "Landing" },
      { href: "/search", icon: IconSearch, label: t("search") },
      { href: "/board", icon: IconDeviceDesktop, label: t("board"), highlighted: true },
      { href: "/myclub", icon: IconUsersGroup, label: t("my_club") },
      { href: "/profile", icon: IconUser, label: t("profile") },
    ],
    [t, user?._id]
  );

  const isActive = (href: string): boolean => {
    const hrefPath = href.split("?")[0];
    if (hrefPath === "/") return normalizedPath === "/" || normalizedPath === "";
    if (hrefPath === "/search" && normalizedPath === "/search") return true;
    return normalizedPath.startsWith(hrefPath);
  };

  const isLiveBoard = normalizedPath.startsWith("/board") || normalizedPath.startsWith("/tournaments");

  return (
    <nav
      className={cn(
        "md:hidden fixed bottom-0 left-0 right-0 z-50",
        "border-t border-border/70 bg-card/80 backdrop-blur-xl",
        "pb-[calc(env(safe-area-inset-bottom)+0.2rem)]"
      )}
    >
      <div
        className="mx-auto grid h-16 max-w-xl gap-1 px-2"
        style={{ gridTemplateColumns: `repeat(${navItems.length}, minmax(0, 1fr))` }}
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          const showProfileBadge = item.href === "/profile" && unreadCount > 0;
          const showLiveBadge = item.href === "/board" && isLiveBoard;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex flex-col items-center justify-center rounded-xl px-1 text-[11px] font-medium transition-all",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              {active ? (
                <motion.span
                  layoutId="mobile-bottom-active-pill"
                  className="absolute inset-1 rounded-xl bg-primary/12"
                  transition={{ duration: 0.2 }}
                />
              ) : null}
              <div
                className={cn(
                  "relative z-10 flex items-center justify-center transition-transform duration-200",
                  active ? "scale-110" : "scale-100",
                  item.highlighted && "rounded-full bg-primary/12 p-2"
                )}
              >
                <Icon size={item.highlighted ? 20 : 18} />
                {showProfileBadge ? (
                  <Badge className="absolute -right-3 -top-2 h-5 min-w-5 px-1 text-[10px]">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </Badge>
                ) : null}
                {showLiveBadge ? (
                  <span className="absolute -right-2 -top-1 flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
                  </span>
                ) : null}
              </div>
              <span className="relative z-10 truncate">{item.label}</span>
              {item.highlighted ? (
                <IconActivityHeartbeat
                  size={12}
                  className={cn("absolute right-2 top-2", active ? "text-primary" : "text-muted-foreground")}
                />
              ) : null}
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
