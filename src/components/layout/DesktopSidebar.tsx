"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useUserContext } from "@/hooks/useUser";
import { useLogout } from "@/hooks/useLogout";
import { useTranslations } from "next-intl";
import { SmartAvatar } from "@/components/ui/smart-avatar";
import { Button } from "@/components/ui/Button";
import {
  IconBell,
  IconBolt,
  IconChevronLeft,
  IconChevronRight,
  IconHome,
  IconLanguage,
  IconLogout,
  IconMapPin,
  IconSearch,
  IconSettings,
  IconTargetArrow,
  IconTrophy,
  IconUser,
  IconUsers,
} from "@tabler/icons-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  DEFAULT_LOCALE,
  localePath,
  stripLocalePrefix,
  SUPPORTED_LOCALES,
  type SupportedLocale,
} from "@/lib/seo";
import { cn } from "@/lib/utils";
import IconDart from "@/components/homapage/icons/IconDart";
import { Badge } from "@/components/ui/Badge";
import { motion } from "framer-motion";

interface NavItem {
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  match?: (path: string, searchParams: URLSearchParams) => boolean;
}

type DesktopSidebarProps = {
  collapsed: boolean;
  onToggleCollapsed: () => void;
};

export const DesktopSidebar: React.FC<DesktopSidebarProps> = ({
  collapsed,
  onToggleCollapsed,
}) => {
  const { user } = useUserContext();
  const { logout } = useLogout();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const t = useTranslations("Navbar");
  const [hasLive, setHasLive] = React.useState(false);

  const normalizedPath = stripLocalePrefix(pathname);
  const maybeLocale = pathname?.split("/")[1];
  const currentLocale: SupportedLocale = SUPPORTED_LOCALES.includes(
    maybeLocale as SupportedLocale
  )
    ? (maybeLocale as SupportedLocale)
    : DEFAULT_LOCALE;

  const navItems = React.useMemo<NavItem[]>(
    () => [
      { href: user?._id ? "/home" : "/", icon: IconHome, label: t.has("home") ? t("home") : "Home" },
      { href: "/landing", icon: IconMapPin, label: t.has("landing") ? t("landing") : "Landing" },
      { href: "/search", icon: IconSearch, label: t("search") },
      {
        href: "/search?tab=tournaments",
        icon: IconTrophy,
        label: t("tournaments"),
        match: (path, params) => path === "/search" && params.get("tab") === "tournaments",
      },
      {
        href: "/search?tab=clubs",
        icon: IconUsers,
        label: t("clubs"),
        match: (path, params) => path === "/search" && params.get("tab") === "clubs",
      },
      { href: "/board", icon: IconTargetArrow, label: t("board") },
      { href: "/map", icon: IconMapPin, label: "Map" },
      {
        href: "/profile?tab=stats",
        icon: IconBolt,
        label: t.has("statistics") ? t("statistics") : t("stats"),
        match: (path, params) => path === "/profile" && params.get("tab") === "stats",
      },
      { href: "/myclub", icon: IconDart, label: t("my_club") },
    ],
    [t, user?._id]
  );

  const languageOptions = React.useMemo(
    () => [
      { code: "hu", label: "Magyar", enabled: true },
      { code: "en", label: "English", enabled: true },
      { code: "de", label: "Deutsch", enabled: true },
      { code: "sk", label: "Slovak", enabled: false },
      { code: "ro", label: "Romanian", enabled: false },
    ],
    []
  );

  React.useEffect(() => {
    const livePaths = ["/tournaments", "/board"];
    const isLiveRoute = livePaths.some((path) => normalizedPath.startsWith(path));
    setHasLive(isLiveRoute);
  }, [normalizedPath]);

  const toLocalizedHref = React.useCallback(
    (href: string): string => {
      if (/^https?:\/\//.test(href)) return href;
      const [pathPart, queryPart] = href.split("?");
      const localizedPath = localePath(pathPart || "/", currentLocale);
      return queryPart ? `${localizedPath}?${queryPart}` : localizedPath;
    },
    [currentLocale]
  );

  const switchLocale = React.useCallback(
    (targetLocale: string) => {
      if (!SUPPORTED_LOCALES.includes(targetLocale as SupportedLocale)) return;
      const targetPath = localePath(normalizedPath, targetLocale as SupportedLocale);
      const query = searchParams.toString();
      router.push(query ? `${targetPath}?${query}` : targetPath);
    },
    [normalizedPath, router, searchParams]
  );

  const isActive = React.useCallback(
    (item: NavItem): boolean => {
      if (item.match) return item.match(normalizedPath, searchParams);
      const hrefPath = item.href.split("?")[0];
      if (hrefPath === "/") return normalizedPath === "/";
      return normalizedPath.startsWith(hrefPath);
    },
    [normalizedPath, searchParams]
  );

  React.useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "b") {
        event.preventDefault();
        onToggleCollapsed();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onToggleCollapsed]);

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 72 : 256 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={cn(
        "hidden md:flex md:fixed md:left-0 md:top-0 md:h-screen md:flex-col",
        "border-r border-border/70 bg-card/80 backdrop-blur-xl",
        "shadow-[0_0_40px_color-mix(in_srgb,black_24%)]",
        collapsed ? "w-[var(--sidebar-collapsed-width)]" : "w-[var(--sidebar-width)]"
      )}
    >
      <div className="p-4 flex items-center justify-between border-b border-border/70">
        <Link
          href={toLocalizedHref(user?._id ? "/home" : "/")}
          className={cn("flex min-w-0 items-center", collapsed ? "justify-center" : "gap-3")}
          aria-label="Go to homepage"
        >
          <div className={cn("relative shrink-0 overflow-hidden rounded-xl bg-primary/15 text-primary shadow-glow-primary", collapsed ? "h-10 w-10" : "h-10 w-10 p-1")}>
            <Image
              src="/tdarts_fav.svg"
              alt="tDarts"
              width={collapsed ? 32 : 36}
              height={collapsed ? 32 : 36}
              className="object-contain"
            />
          </div>
          {!collapsed ? (
            <div className="min-w-0">
              <p className="text-base font-bold tracking-tight text-foreground">tDarts</p>
              <p className="text-[11px] text-muted-foreground">Tournament Hub</p>
            </div>
          ) : null}
        </Link>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={onToggleCollapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <IconChevronRight size={16} /> : <IconChevronLeft size={16} />}
        </Button>
      </div>

      <div className="px-3 pt-4">
        {hasLive ? (
          <div
            className={cn(
              "mb-4 flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-3 py-2 text-primary",
              collapsed && "justify-center px-2"
            )}
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            {!collapsed ? <span className="text-xs font-semibold">Live</span> : null}
          </div>
        ) : null}

        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item);
            return (
              <Link
                key={item.href}
                href={toLocalizedHref(item.href)}
                className={cn(
                  "group relative flex items-center gap-3 overflow-hidden rounded-xl px-3 py-3 text-sm font-medium transition-all",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  active
                    ? "bg-primary text-primary-foreground shadow-[var(--shadow-nav-active)]"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                  collapsed && "justify-center px-2"
                )}
              >
                <Icon size={18} className="shrink-0" />
                {!collapsed ? <span className="truncate">{item.label}</span> : null}
                {active ? (
                  <motion.span
                    layoutId="desktop-active-pill"
                    className="absolute inset-0 -z-10 rounded-xl bg-primary"
                  />
                ) : null}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="mt-auto p-3 border-t border-border/70 space-y-2">
        {!collapsed ? (
          <div className="mb-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Shortcut
            </p>
            <p className="text-xs text-foreground">
              Toggle sidebar <span className="font-semibold">Cmd/Ctrl + B</span>
            </p>
          </div>
        ) : null}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                "w-full flex items-center gap-3 rounded-xl p-2.5 text-left transition-colors hover:bg-muted/60",
                collapsed && "justify-center"
              )}
            >
              <IconLanguage size={16} className="text-muted-foreground" />
              {!collapsed ? <span className="text-sm uppercase">{currentLocale}</span> : null}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            {languageOptions.map((lang) => (
              <DropdownMenuItem
                key={lang.code}
                disabled={!lang.enabled}
                className="flex items-center justify-between"
                onClick={() => {
                  if (lang.enabled) switchLocale(lang.code);
                }}
              >
                <span>{lang.label}</span>
                {!lang.enabled ? (
                  <span className="text-xs text-muted-foreground">{t("coming_soon")}</span>
                ) : null}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  "w-full flex items-center gap-3 rounded-xl p-2.5 transition-colors hover:bg-muted/60",
                  collapsed && "justify-center"
                )}
              >
                <SmartAvatar
                  playerId={user._id}
                  name={user.name || user.username}
                  size="sm"
                />
                {!collapsed ? (
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">{user.name || user.username}</p>
                    <div className="flex items-center gap-1">
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      {user.isAdmin ? <Badge className="text-[10px] px-1.5 py-0">Admin</Badge> : null}
                    </div>
                  </div>
                ) : null}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem asChild>
                <Link href={toLocalizedHref("/profile")} className="cursor-pointer">
                  <IconUser size={16} className="mr-2" />
                  {t("profile")}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={toLocalizedHref("/profile?tab=tickets")} className="cursor-pointer">
                  <IconBell size={16} className="mr-2" />
                  {t("tickets")}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={toLocalizedHref("/settings")} className="cursor-pointer">
                  <IconSettings size={16} className="mr-2" />
                  {t.has("settings") ? t("settings") : "Settings"}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={toLocalizedHref("/landing")} className="cursor-pointer">
                  <IconMapPin size={16} className="mr-2" />
                  {t.has("landing") ? t("landing") : "Landing"}
                </Link>
              </DropdownMenuItem>
              {user.isAdmin ? (
                <DropdownMenuItem asChild>
                  <Link href={toLocalizedHref("/admin")} className="cursor-pointer">
                    <IconBolt size={16} className="mr-2" />
                    {t("admin")}
                  </Link>
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="cursor-pointer text-destructive">
                <IconLogout size={16} className="mr-2" />
                {t("logout")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Link href={toLocalizedHref("/auth/login")} className="block">
            <Button className="w-full" size={collapsed ? "icon" : "default"}>
              {collapsed ? <IconUser size={16} /> : t("login")}
            </Button>
          </Link>
        )}
      </div>
    </motion.aside>
  );
};
