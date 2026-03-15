"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUserContext } from "@/hooks/useUser";
import { useLogout } from "@/hooks/useLogout";
import { useTranslations } from "next-intl";
import { SmartAvatar } from "@/components/ui/smart-avatar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/Button";
import {
  IconTournament,
  IconUsers,
  IconUser,
  IconLogout,
  IconChartBar,
  IconSettings,
  IconHome,
} from "@tabler/icons-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { stripLocalePrefix } from "@/lib/seo";
import { cn } from "@/lib/utils";
import IconDart from "@/components/homapage/icons/IconDart";

interface NavItem {
  href: string;
  icon: React.ReactNode;
  label: string;
  hideOnMobile?: boolean;
}

export const DesktopSidebar: React.FC = () => {
  const { user } = useUserContext();
  const { logout } = useLogout();
  const pathname = usePathname();
  const t = useTranslations("Navbar");

  const normalizedPath = stripLocalePrefix(pathname);

  const navItems: NavItem[] = [
    { href: "/", icon: <IconHome size={20} />, label: t("home") },
    {
      href: "/tournaments",
      icon: <IconTournament size={20} />,
      label: t("tournaments"),
    },
    {
      href: "/clubs",
      icon: <IconUsers size={20} />,
      label: t("clubs"),
    },
    {
      href: "/statistics",
      icon: <IconChartBar size={20} />,
      label: t("statistics"),
      hideOnMobile: true,
    },
  ];

  const isActive = (href: string): boolean => {
    if (href === "/") return normalizedPath === "/" || normalizedPath === "";
    return normalizedPath.startsWith(href.replace("/", ""));
  };

  return (
    <aside className="hidden md:flex md:fixed md:left-0 md:top-0 md:h-screen md:w-64 md:flex-col md:bg-card md:border-r md:border-border">
      {/* Logo Section */}
      <div className="p-6 flex items-center gap-3 border-b border-border">
        <IconDart size={32} className="text-primary" />
        <span className="text-xl font-bold text-foreground hidden lg:inline">
          tDarts
        </span>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => (
          <Link key={item.href} href={item.href}>
            <div
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors duration-200",
                isActive(item.href)
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground hover:bg-muted"
              )}
            >
              {item.icon}
              <span className="text-sm font-medium hidden lg:inline">
                {item.label}
              </span>
            </div>
          </Link>
        ))}
      </nav>

      {/* User Section */}
      <div className="p-4 border-t border-border space-y-4">
        {user ? (
          <>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors duration-200">
                  <SmartAvatar
                    src={user.avatar}
                    alt={user.name}
                    size="sm"
                    fallback={user.name?.[0]?.toUpperCase()}
                  />
                  <div className="text-left hidden lg:block">
                    <p className="text-xs font-semibold text-foreground truncate">
                      {user.name}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {user.email}
                    </p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="cursor-pointer">
                    <IconUser size={16} className="mr-2" />
                    {t("profile")}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings" className="cursor-pointer">
                    <IconSettings size={16} className="mr-2" />
                    {t("settings")}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="cursor-pointer">
                  <IconLogout size={16} className="mr-2" />
                  {t("logout")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        ) : (
          <Link href="/auth/login">
            <Button className="w-full">{t("login")}</Button>
          </Link>
        )}
      </div>
    </aside>
  );
};
