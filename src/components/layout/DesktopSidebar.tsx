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
  IconInfoCircle,
  IconLanguage,
  IconLogout,
  IconPlayerPlay,
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
import { useOngoingTournamentQuickLink } from "@/features/navigation/hooks/useOngoingTournamentQuickLink";

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
  const { ongoingTournament } = useOngoingTournamentQuickLink(user?._id);

  const normalizedPath = stripLocalePrefix(pathname);
  const maybeLocale = pathname?.split("/")[1];
  const currentLocale: SupportedLocale = SUPPORTED_LOCALES.includes(
    maybeLocale as SupportedLocale
  )
    ? (maybeLocale as SupportedLocale)
    : DEFAULT_LOCALE;

  const navItems = React.useMemo<NavItem[]>(
    () => [
      {
        href: "/",
        icon: IconHome,
        label: "Home",
        match: (path) => path === "/" || path === "/home" || path === "/landing",
      },
      {
        href: "/search",
        icon: IconTrophy,
        label: "Versenyek",
        match: (path, params) => path === "/search" && params.get("tab") !== "clubs",
      },
      {
        href: "/search?tab=clubs",
        icon: IconUsers,
        label: "Klubok",
        match: (path, params) =>
          (path === "/search" && params.get("tab") === "clubs") || path.startsWith("/clubs"),
      },
      { href: "/board", icon: IconTargetArrow, label: "Tábla" },
      { href: "/how-it-works", icon: IconInfoCircle, label: "Hogyan működik" },
      {
        href: "/profile",
        icon: IconUser,
        label: "Profil",
      },
      { href: "/myclub", icon: IconDart, label: "Saját klub" },
    ],
    []
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
    <aside
      className={cn(
        "hidden md:flex md:fixed md:left-0 md:top-0 md:h-screen md:flex-col",
        "border-r border-border/60 bg-linear-to-b from-card/75 via-card/65 to-card/55 backdrop-blur-2xl",
        "shadow-[0_0_40px_color-mix(in_srgb,black_24%)] transition-[width] duration-300 ease-out",
        collapsed ? "w-(--sidebar-collapsed-width)" : "w-(--sidebar-width)"
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
                    ? "scale-[1.02] bg-primary text-primary-foreground shadow-(--shadow-nav-active)"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                  collapsed && "justify-center px-2"
                )}
              >
                <Icon size={18} className="shrink-0" />
                {!collapsed ? <span className="truncate">{item.label}</span> : null}
                {active ? (
                  <span className="absolute inset-0 -z-10 rounded-xl bg-primary" />
                ) : null}
              </Link>
            );
          })}

          {ongoingTournament?.code ? (
            <Link
              href={toLocalizedHref(`/tournaments/${ongoingTournament.code}`)}
              className={cn(
                "group relative mt-2 flex items-center gap-3 overflow-hidden rounded-xl border border-primary/35 bg-primary/10 px-3 py-3 text-sm font-medium text-primary transition-all hover:bg-primary/15",
                collapsed && "justify-center px-2"
              )}
              title={ongoingTournament.name}
            >
              <IconPlayerPlay size={18} className="shrink-0" />
              {!collapsed ? <span className="truncate">Aktív torna</span> : null}
            </Link>
          ) : null}
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
                  <IconHome size={16} className="mr-2" />
                  Home
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
          <div className="space-y-2">
            <Link href={toLocalizedHref("/auth/login")} className="block">
              <Button className="w-full" size={collapsed ? "icon" : "default"}>
                {collapsed ? <IconUser size={16} /> : t("login")}
              </Button>
            </Link>
            {!collapsed ? (
              <Link href={toLocalizedHref("/auth/register")} className="block">
                <Button variant="outline" className="w-full">
                  {t.has("register") ? t("register") : "Register"}
                </Button>
              </Link>
            ) : null}
          </div>
        )}
      </div>
    </aside>
  );
};
