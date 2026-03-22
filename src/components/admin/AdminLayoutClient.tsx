"use client";

import { useState, ReactNode, useMemo, useEffect } from "react";
import { Link, usePathname } from "@/i18n/routing";
import { adminFeedbackActions } from "@/features/admin/actions/adminDomains.action";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { useTranslations } from "next-intl";
import {
  IconUsers,
  IconBuilding,
  IconTrophy,
  IconMedal,
  IconMessageCircle,
  IconAlertTriangle,
  IconSpeakerphone,
  IconCheck,
  IconSettings,
  IconLayoutDashboard,
  IconChevronLeft,
  IconChevronRight,
  IconMenu2,
  IconMail,
  IconActivity,
  IconHome,
} from "@tabler/icons-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { CommandPalette, useCommandPalette } from "@/components/admin/CommandPalette";
import { GlobalTodoShortcut } from "@/components/admin/GlobalTodoShortcut";
import Image from "next/image";
import type { ServerUser } from "@/lib/getServerUser";

interface AdminLayoutClientProps {
  children: ReactNode;
  user: ServerUser;
}

function SidebarContent({
  isCollapsed = false,
  onNavigate,
  onToggleCollapse,
  feedbackUnreadCount = 0,
}: {
  isCollapsed?: boolean;
  onNavigate?: () => void;
  onToggleCollapse?: () => void;
  feedbackUnreadCount?: number;
}) {
  const pathname = usePathname();
  const t = useTranslations("Admin.layout");

  const sidebarItems = useMemo(
    () => [
      { title: "sidebar.dashboard", href: "/admin", icon: IconLayoutDashboard },
      { title: "sidebar.users", href: "/admin/users", icon: IconUsers },
      { title: "sidebar.clubs", href: "/admin/clubs", icon: IconBuilding },
      { title: "sidebar.tournaments", href: "/admin/tournaments", icon: IconTrophy },
      { title: "sidebar.leagues", href: "/admin/leagues", icon: IconMedal },
      { title: "sidebar.feedback", href: "/admin/feedback", icon: IconMessageCircle },
      { title: "sidebar.errors", href: "/admin/errors", icon: IconAlertTriangle },
      { title: "sidebar.announcements", href: "/admin/announcements", icon: IconSpeakerphone },
      { title: "sidebar.todos", href: "/admin/todos", icon: IconCheck },
      { title: "sidebar.emails", href: "/admin/emails", icon: IconMail },
      { title: "sidebar.settings", href: "/admin/settings", icon: IconSettings },
      { title: "sidebar.telemetry", href: "/admin/telemetry", icon: IconActivity },
    ],
    []
  );

  return (
    <nav className="flex flex-col gap-1.5 p-2 h-[calc(100vh-4rem)]">
      <div className="space-y-1.5">
        {sidebarItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          const isFeedback = item.href === "/admin/feedback";
          const showUnread = isFeedback && feedbackUnreadCount > 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              aria-label={
                showUnread && isCollapsed
                  ? t("sidebar.feedback_unread_aria", { count: feedbackUnreadCount })
                  : undefined
              }
              className={cn(
                "relative flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200 border",
                "hover:bg-muted hover:text-foreground hover:scale-[1.02] hover:shadow-sm",
                "active:scale-[0.98]",
                isActive
                  ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20"
                  : "text-muted-foreground border-transparent hover:border-border/50",
                isCollapsed && "justify-center px-3"
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!isCollapsed && (
                <>
                  <span className="truncate">{t(item.title)}</span>
                  {showUnread && (
                    <span
                      className={cn(
                        "ml-auto shrink-0 min-w-5 rounded-full px-1.5 py-0.5 text-center text-[10px] font-bold leading-none",
                        isActive ? "bg-primary-foreground/20 text-primary-foreground" : "bg-destructive text-destructive-foreground"
                      )}
                      aria-label={t("sidebar.feedback_unread_aria", { count: feedbackUnreadCount })}
                    >
                      {feedbackUnreadCount > 99 ? "99+" : feedbackUnreadCount}
                    </span>
                  )}
                </>
              )}
              {isCollapsed && showUnread && (
                <span
                  className="absolute right-2 top-2 h-2 w-2 rounded-full bg-destructive"
                  aria-hidden
                />
              )}
            </Link>
          );
        })}
      </div>
      {onToggleCollapse && (
        <>
          <div className="my-2 border-t border-border/50" />
          <Button
            variant="ghost"
            onClick={onToggleCollapse}
            className={cn(
              "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-muted-foreground transition-all duration-200 hover:bg-muted hover:text-foreground",
              isCollapsed && "justify-center px-3"
            )}
          >
            {isCollapsed ? (
              <IconChevronRight className="h-5 w-5" />
            ) : (
              <>
                <IconChevronLeft className="h-5 w-5" />
                <span className="truncate">{t("sidebar.collapse")}</span>
              </>
            )}
          </Button>
        </>
      )}
    </nav>
  );
}

export function AdminLayoutClient({ children, user }: AdminLayoutClientProps) {
  const t = useTranslations("Admin.layout");
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [feedbackUnreadCount, setFeedbackUnreadCount] = useState(0);
  const { isOpen: isCommandOpen, setIsOpen: setCommandOpen } = useCommandPalette();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await adminFeedbackActions.unreadCount();
        if (cancelled || !res?.ok) return;
        const data = res.data as { success?: boolean; count?: number };
        if (data?.success) setFeedbackUnreadCount(Number(data.count ?? 0));
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  return (
    <>
      <CommandPalette isOpen={isCommandOpen} onClose={() => setCommandOpen(false)} />
      <GlobalTodoShortcut />

      <div className="flex h-screen overflow-hidden bg-background">
        <aside
          className={cn(
            "hidden lg:flex flex-col border-r border-border/70 bg-card/80 backdrop-blur-xl transition-all duration-300",
            isCollapsed ? "w-16" : "w-64"
          )}
        >
          <div className="h-4" />
          <div className="flex-1 overflow-y-auto py-4">
            <SidebarContent
              isCollapsed={isCollapsed}
              onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
              feedbackUnreadCount={feedbackUnreadCount}
            />
          </div>
        </aside>

        <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
          <SheetTrigger asChild className="lg:hidden fixed top-4 left-4 z-50">
            <Button variant="outline" size="icon" className="bg-card shadow-lg">
              <IconMenu2 className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0">
            <div className="flex flex-col h-full bg-card">
              <div className="flex items-center gap-2 justify-start border-b border-border px-4 py-6 bg-muted/30">
                <Image src="/tdarts_fav.svg" alt={t("tdarts_f0pi")} width={32} height={32} className="rounded-md" />
                <div className="flex flex-col items-start">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-bold text-xl tracking-tight">{t("sidebar.title")}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t("status.welcome", { name: user?.name?.split(" ")[0] || "Admin" })}
                  </p>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto py-4">
                <SidebarContent
                  onNavigate={() => setIsMobileOpen(false)}
                  feedbackUnreadCount={feedbackUnreadCount}
                />
              </div>
            </div>
          </SheetContent>
        </Sheet>

        <main className="flex-1 overflow-y-auto">
          <div className="border-b border-border/70 bg-card/40 backdrop-blur supports-backdrop-filter:bg-card/30">
            <div className="container mx-auto flex max-w-[1600px] items-center justify-end px-4 py-3 lg:px-8">
              <Link href="/home" className="inline-flex">
                <Button variant="outline" size="sm" className="gap-2">
                  <IconHome className="h-4 w-4" />
                  {t("back_to_home")}
                </Button>
              </Link>
            </div>
          </div>
          <div className="container mx-auto px-4 py-8 lg:px-8 lg:py-10 max-w-[1600px]">{children}</div>
        </main>
      </div>
    </>
  );
}
