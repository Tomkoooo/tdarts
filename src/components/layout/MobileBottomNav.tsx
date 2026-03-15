"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  IconTournament,
  IconUsers,
  IconUser,
  IconHome,
  IconChartBar,
  IconMenu2,
} from "@tabler/icons-react";
import { stripLocalePrefix } from "@/lib/seo";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  icon: React.ReactNode;
  label: string;
}

export const MobileBottomNav: React.FC = () => {
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
    },
    {
      href: "/profile",
      icon: <IconUser size={20} />,
      label: t("profile"),
    },
  ];

  const isActive = (href: string): boolean => {
    if (href === "/") return normalizedPath === "/" || normalizedPath === "";
    return normalizedPath.startsWith(href.replace("/", ""));
  };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t border-border bg-card z-50">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => (
          <Link key={item.href} href={item.href} className="flex-1">
            <div
              className={cn(
                "flex flex-col items-center justify-center h-16 gap-1 transition-colors duration-200",
                isActive(item.href)
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {item.icon}
              <span className="text-xs font-medium text-center px-1">
                {item.label}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </nav>
  );
};
