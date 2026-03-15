"use client"

import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import Footer from '@/components/homapage/Footer'
import { DesktopSidebar } from '@/components/layout/DesktopSidebar'
import { MobileBottomNav } from '@/components/layout/MobileBottomNav'
import { PageTransitionWrapper } from '@/components/layout/PageTransitionWrapper'
import { stripLocalePrefix } from "@/lib/seo"
import {
  shouldHideNavbar,
  shouldShowFooter,
  shouldUseAppShell,
  shouldUseAuthShell,
  shouldUseMarketingShell,
} from "@/lib/navigation/shell-routing"
import { ModalProvider } from '@/components/modal/UnifiedModal'

export function NavbarProvider({ 
  children, 
  initialShouldHide = false,
  initialPath = "",
}: { 
  children: React.ReactNode
  initialShouldHide?: boolean
  initialPath?: string
}) {
  const pathname = usePathname()
  const [shellState, setShellState] = useState(() => {
    const path = initialPath || stripLocalePrefix(pathname || "/")
    return {
      shouldHide: initialShouldHide,
      showFooter: shouldShowFooter(path),
      useAppShell: shouldUseAppShell(path),
      useAuthShell: shouldUseAuthShell(path),
      useMarketingShell: shouldUseMarketingShell(path),
    }
  })
  const [isCollapsed, setIsCollapsed] = useState(false)

  useEffect(() => {
    const normalizedPath = stripLocalePrefix(pathname || "/")
    const hide = shouldHideNavbar(normalizedPath)
    const showFooter = shouldShowFooter(normalizedPath)
    const useAppShell = shouldUseAppShell(normalizedPath)
    const useAuthShell = shouldUseAuthShell(normalizedPath)
    const useMarketingShell = shouldUseMarketingShell(normalizedPath)

    setShellState({
      shouldHide: hide,
      showFooter,
      useAppShell,
      useAuthShell,
      useMarketingShell,
    })
  }, [pathname])

  useEffect(() => {
    const saved = localStorage.getItem("tdarts.sidebar.collapsed")
    if (saved !== null) {
      setIsCollapsed(saved === "true")
    }
  }, [])

  const handleToggleCollapsed = () => {
    setIsCollapsed((prev) => {
      const next = !prev
      localStorage.setItem("tdarts.sidebar.collapsed", String(next))
      return next
    })
  }

  const content = shellState.shouldHide ? (
    <main className="flex-1">{children}</main>
  ) : shellState.useMarketingShell ? (
    <div className="flex min-h-screen flex-col">
      <div className="flex flex-1 flex-col min-h-0">
        <main className="flex-1 pb-20 md:pb-0">
          <PageTransitionWrapper>{children}</PageTransitionWrapper>
        </main>
        {shellState.showFooter && <Footer />}
      </div>
      <MobileBottomNav />
    </div>
  ) : shellState.useAppShell ? (
    <div className={isCollapsed ? "flex min-h-screen flex-col md:pl-[var(--sidebar-collapsed-width)]" : "flex min-h-screen flex-col md:pl-[var(--sidebar-width)]"}>
      <DesktopSidebar collapsed={isCollapsed} onToggleCollapsed={handleToggleCollapsed} />
      <div className="flex flex-1 flex-col min-h-0">
        <main className="flex-1 pb-20 md:pb-0">
          <PageTransitionWrapper>{children}</PageTransitionWrapper>
        </main>
        {shellState.showFooter && <Footer />}
      </div>
      <MobileBottomNav />
    </div>
  ) : shellState.useAuthShell ? (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 md:p-6">
      <PageTransitionWrapper>{children}</PageTransitionWrapper>
    </main>
  ) : (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 md:p-6">
      {children}
    </main>
  )

  return <ModalProvider>{content}</ModalProvider>
}

