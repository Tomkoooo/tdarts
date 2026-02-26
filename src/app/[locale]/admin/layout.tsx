"use client"

import { useEffect, useState, ReactNode, useMemo } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/Button"
import { useUserContext } from "@/hooks/useUser"
import axios from "axios"
import { useTranslations } from "next-intl"
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
} from "@tabler/icons-react"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { CommandPalette, useCommandPalette } from "@/components/admin/CommandPalette"
import { GlobalTodoShortcut } from "@/components/admin/GlobalTodoShortcut"
import Image from "next/image"

interface AdminLayoutProps {
  children: ReactNode
}

function SidebarContent({ isCollapsed = false, onNavigate, onToggleCollapse }: { isCollapsed?: boolean; onNavigate?: () => void; onToggleCollapse?: () => void }) {
  const pathname = usePathname()
  const t = useTranslations("Admin.layout")

  const sidebarItems = useMemo(() => ([
    {
      title: "sidebar_dashboard_a3kc",
      href: "/admin",
      icon: IconLayoutDashboard,
    },
    {
      title: "sidebar_users_arcp",
      href: "/admin/users",
      icon: IconUsers,
    },
    {
      title: "sidebar_clubs_b1d5",
      href: "/admin/clubs",
      icon: IconBuilding,
    },
    {
      title: "sidebar_tournaments_6vcv",
      href: "/admin/tournaments",
      icon: IconTrophy,
    },
    {
      title: "sidebar_leagues_xluc",
      href: "/admin/leagues",
      icon: IconMedal,
    },
    {
      title: "sidebar_feedback_ic83",
      href: "/admin/feedback",
      icon: IconMessageCircle,
    },
    {
      title: "sidebar_errors_e0kt",
      href: "/admin/errors",
      icon: IconAlertTriangle,
    },
    {
      title: "sidebar_announcements_pvfc",
      href: "/admin/announcements",
      icon: IconSpeakerphone,
    },
    {
      title: "sidebar_todos_arz2",
      href: "/admin/todos",
      icon: IconCheck,
    },
    {
      title: "sidebar_emails_dxiv",
      href: "/admin/emails",
      icon: IconMail,
    },
    {
      title: "sidebar_settings_psqa",
      href: "/admin/settings",
      icon: IconSettings,
    },
  ]), []);

  return (
    <nav className="flex flex-col gap-1.5 p-2 h-[calc(100vh-4rem)]">
      <div className="space-y-1.5">
      {sidebarItems.map((item) => {
        const Icon = item.icon
        const isActive = pathname === item.href
        
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200 border",
              "hover:bg-muted hover:text-foreground hover:scale-[1.02] hover:shadow-sm",
              "active:scale-[0.98]",
              isActive 
                ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20" 
                : "text-muted-foreground border-transparent hover:border-border/50",
              isCollapsed && "justify-center px-3"
            )}
          >
            <Icon className={cn("h-5 w-5 flex-shrink-0")} />
            {!isCollapsed && <span className="truncate">{t(item.title as any)}</span>}
          </Link>
        )
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
  )
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const t = useTranslations("Admin.layout");
  const { user } = useUserContext()
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [adminLoading, setAdminLoading] = useState(true)
  const router = useRouter()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const { isOpen: isCommandOpen, setIsOpen: setCommandOpen } = useCommandPalette()
  useEffect(() => {
    const checkAdminStatus = async () => {
      setAdminLoading(true)
      if (!user) {
        setAdminLoading(false)
        router.push(`/auth/login?redirect=${encodeURIComponent('/admin')}`)
        return
      }

      try {
        const response = await axios.get('/api/admin/check-status')
        setIsAdmin(response.data.isAdmin)
        
        if (!response.data.isAdmin) {
          setAdminLoading(false)
          router.push('/profile')
          return
        }
      } catch (error) {
        setAdminLoading(false)
        console.error('Error checking admin status:', error)
        router.push('/profile')
        return
      } finally {
        setAdminLoading(false)
      }
    }

    if (user) {
      checkAdminStatus()
    }
  }, [user, router])

  // Loading state
  if (adminLoading || isAdmin === null || !user) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Skeleton className="h-16 w-16 rounded-2xl" />
          <p className="text-sm text-muted-foreground">{t("status.checking")}</p>
        </div>
      </div>
    )
  }

  // Not admin
  if (!isAdmin) {
    return null
  }

  return (
    <>
      <CommandPalette isOpen={isCommandOpen} onClose={() => setCommandOpen(false)} />
      <GlobalTodoShortcut />
      
      <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden lg:flex flex-col border-r border-border bg-card transition-all duration-300",
          isCollapsed ? "w-16" : "w-64"
        )}
      >
        <div className="h-4" /> {/* Spacer */}

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto py-4">
          <SidebarContent isCollapsed={isCollapsed} onToggleCollapse={() => setIsCollapsed(!isCollapsed)} />
        </div>
      </aside>

      {/* Mobile Sidebar */}
      <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
        <SheetTrigger asChild className="lg:hidden fixed top-4 left-4 z-50">
          <Button variant="outline" size="icon" className="bg-card shadow-lg">
            <IconMenu2 className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0">
          <div className="flex flex-col h-full bg-card">
            {/* Mobile Header */}
            <div className="flex items-center gap-2 justify-start border-b border-border px-4 py-6 bg-muted/30">
                 <Image src="/tdarts_fav.svg" alt={t("tdarts_f0pi")} width={32} height={32} className="rounded-md" />
               <div className="flex flex-col items-start">
                 <div className="flex items-center gap-3 mb-2">
                   <span className="font-bold text-xl tracking-tight">{t("sidebar.title")}</span>
                 </div>
                 <p className="text-sm text-muted-foreground">
                   {t("status.welcome", { name: user?.name?.split(' ')[0] || 'Admin' })}
                 </p>
               </div>
            </div>

            {/* Mobile Navigation */}
            <div className="flex-1 overflow-y-auto py-4">
              <SidebarContent onNavigate={() => setIsMobileOpen(false)} />
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="container mx-auto px-4 py-8 lg:px-8 lg:py-10 max-w-[1600px]">
          {children}
        </div>
      </main>
    </div>
    </>
  )
}
