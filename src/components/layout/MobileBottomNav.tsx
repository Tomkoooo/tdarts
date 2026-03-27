"use client";

import React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  IconBolt,
  IconDeviceDesktop,
  IconHome,
  IconLanguage,
  IconPlayerPlay,
  IconSearch,
  IconUser,
  IconUsersGroup,
} from "@tabler/icons-react";
import { DEFAULT_LOCALE, localePath, stripLocalePrefix, SUPPORTED_LOCALES, type SupportedLocale } from "@/lib/seo";
import { cn } from "@/lib/utils";
import { useUnreadTickets } from "@/hooks/useUnreadTickets";
import { useUserContext } from "@/hooks/useUser";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Link } from "@/i18n/routing";
import { useOngoingTournamentQuickLinkWithOptions } from "@/features/navigation/hooks/useOngoingTournamentQuickLink";
import { findActiveNavIndex, matchesMyClubRoute } from "@/lib/navigation/nav-active";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface NavItem {
  id: string;
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  match?: (path: string, searchParams: URLSearchParams) => boolean;
}

export const MobileBottomNav: React.FC = () => {
  const { user } = useUserContext();
  const isGlobalAdmin = user?.isAdmin === true;
  const t = useTranslations("Navbar");
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [allowDeferredHooks, setAllowDeferredHooks] = React.useState(false);
  const normalizedPath = stripLocalePrefix(pathname);
  const maybeLocale = pathname?.split("/")[1];
  const currentLocale: SupportedLocale = SUPPORTED_LOCALES.includes(
    maybeLocale as SupportedLocale
  )
    ? (maybeLocale as SupportedLocale)
    : DEFAULT_LOCALE;
  const isClubRoute = normalizedPath.startsWith("/clubs");
  const hooksEnabled = !isClubRoute || allowDeferredHooks;
  const { unreadCount } = useUnreadTickets({ enabled: Boolean(user?._id) && hooksEnabled, deferMs: isClubRoute ? 1200 : 0 });
  const { ongoingTournament } = useOngoingTournamentQuickLinkWithOptions(user?._id, {
    enabled: hooksEnabled,
    deferMs: isClubRoute ? 1200 : 0,
  });
  const hasQuickTournament = Boolean(ongoingTournament?.code);
  React.useEffect(() => {
    if (!isClubRoute) {
      setAllowDeferredHooks(true);
      return;
    }
    const timer = window.setTimeout(() => {
      setAllowDeferredHooks(true);
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [isClubRoute]);

  const navItems = React.useMemo<NavItem[]>(() => {
    const boardItemLoggedIn: NavItem = {
      id: "board",
      href: "/board",
      icon: IconDeviceDesktop,
      label: t("board"),
      match: (path) => path.startsWith("/board"),
    };
    const boardItemGuest: NavItem = {
      id: "board",
      href: "/board",
      icon: IconDeviceDesktop,
      label: t("board"),
      match: (path) => path.startsWith("/board"),
    };

    if (user) {
      return [
        {
          id: "home",
          href: "/",
          icon: IconHome,
          label: t("home"),
          match: (path) => path === "/" || path === "/home" || path === "/landing",
        },
        {
          id: "search",
          href: "/search",
          icon: IconSearch,
          label: t("search"),
          match: (path) => path === "/search",
        },
        ...(hasQuickTournament ? [] : [boardItemLoggedIn]),
        ...(hasQuickTournament
          ? [
              {
                id: "today-tournament",
                href: `/tournaments/${ongoingTournament!.code}`,
                icon: IconPlayerPlay,
                label: "Verseny",
                match: (path: string) => path === `/tournaments/${ongoingTournament!.code}`,
              } as NavItem,
            ]
          : []),
        {
          id: "profile",
          href: "/profile",
          icon: IconUser,
          label: t("profile"),
        },
        {
          id: "myclub",
          href: "/myclub",
          icon: IconUsersGroup,
          label: t("my_club"),
          match: (path) => matchesMyClubRoute(path),
        },
        ...(isGlobalAdmin
          ? [
              {
                id: "admin",
                href: "/admin",
                icon: IconBolt,
                label: t("admin"),
                match: (path: string) => path.startsWith("/admin"),
              },
            ]
          : []),
      ];
    }

    return [
      {
        id: "home",
        href: "/",
        icon: IconHome,
        label: t("home"),
        match: (path) => path === "/" || path === "/landing",
      },
      {
        id: "search",
        href: "/search",
        icon: IconSearch,
        label: t("search"),
        match: (path) => path === "/search",
      },
      boardItemGuest,
      {
        id: "login",
        href: "/auth/login",
        icon: IconUser,
        label: t("login"),
        match: (path) => path.startsWith("/auth/login"),
      },
      {
        id: "register",
        href: "/auth/register",
        icon: IconUsersGroup,
        label: t("register"),
        match: (path) => path.startsWith("/auth/register"),
      },
    ];
  }, [user, isGlobalAdmin, hasQuickTournament, ongoingTournament?.code, t]);

  const isActive = (item: NavItem): boolean => {
    if (item.match) return item.match(normalizedPath, searchParams);
    const hrefPath = item.href.split("?")[0];
    if (hrefPath === "/") return normalizedPath === "/" || normalizedPath === "";
    return normalizedPath.startsWith(hrefPath);
  };

  const activeIndex = React.useMemo(
    () => findActiveNavIndex(navItems, normalizedPath, new URLSearchParams(searchParams.toString())),
    [navItems, normalizedPath, searchParams]
  );

  const slotPercent = 100 / navItems.length;

  const bubbleStyle =
    activeIndex === null
      ? undefined
      : {
          left: `calc(${slotPercent * activeIndex}% + ${slotPercent / 2}% - 1.75rem)`,
        };

  const languageOptions = React.useMemo(
    () => [
      { code: "hu", label: "Magyar" },
      { code: "en", label: "English" },
      { code: "de", label: "Deutsch" },
    ],
    []
  );

  const switchLocale = React.useCallback(
    (targetLocale: string) => {
      if (!SUPPORTED_LOCALES.includes(targetLocale as SupportedLocale)) return;
      const targetPath = localePath(normalizedPath || "/", targetLocale as SupportedLocale);
      const query = searchParams.toString();
      router.push(query ? `${targetPath}?${query}` : targetPath);
    },
    [normalizedPath, router, searchParams]
  );

  return (
    <nav
      className={cn(
        "fixed inset-x-0 bottom-0 z-50 md:hidden",
        "bg-background/45 backdrop-blur-[2px]",
        "pb-[calc(env(safe-area-inset-bottom)+0.35rem)]"
      )}
    >
      <div className="mx-auto mb-1 flex w-full max-w-md justify-end px-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 rounded-full border-border/70 bg-card/80 px-2.5 text-xs shadow-sm"
              aria-label={t("select_language")}
            >
              <IconLanguage size={14} className="mr-1.5" />
              {currentLocale.toUpperCase()}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36">
            {languageOptions.map((lang) => (
              <DropdownMenuItem
                key={lang.code}
                onClick={() => switchLocale(lang.code)}
                className="flex items-center justify-between"
              >
                <span>{lang.label}</span>
                {currentLocale === lang.code ? <span className="text-xs text-muted-foreground">•</span> : null}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="mx-auto w-full max-w-md px-3">
        <div
          className={cn(
            "relative h-[4.35rem] rounded-[1.15rem] border border-border/70",
            "bg-linear-to-b from-card/90 to-card/70 backdrop-blur-xl",
            "shadow-sm"
          )}
        >
          {bubbleStyle ? (
            <span
              className="pointer-events-none absolute -top-6 h-14 w-14 rounded-full border-2 border-primary/35 bg-primary text-primary-foreground shadow-[0_12px_28px_rgba(146,34,16,0.5)] ring-2 ring-primary/20 transition-all duration-500 ease-out"
              style={bubbleStyle}
            />
          ) : null}

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
