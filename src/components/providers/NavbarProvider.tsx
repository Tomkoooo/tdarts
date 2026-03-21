"use client"

import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import Footer from '@/components/homapage/Footer'
import { DesktopSidebar } from '@/components/layout/DesktopSidebar'
import { MobileBottomNav } from '@/components/layout/MobileBottomNav'
import { PageTransitionWrapper } from '@/components/layout/PageTransitionWrapper'
import { stripLocalePrefix } from "@/lib/seo"
import { cn } from "@/lib/utils"
import {
  shouldHideNavbar,
  shouldShowFooter,
} from "@/lib/navigation/shell-routing"
import { ModalProvider } from '@/components/modal/UnifiedModal'
import { MobileNavSuppressionProvider, useMobileNavSuppression } from '@/components/providers/MobileNavSuppressionContext'

function NavbarProviderInner({
  children,
  initialShouldHide,
  initialPath,
}: {
  children: React.ReactNode
  initialShouldHide: boolean
  initialPath: string
}) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [shellState, setShellState] = useState(() => {
    const path = initialPath || stripLocalePrefix(pathname || "/")
    const computedHide = shouldHideNavbar(path, null)
    return {
      shouldHide: initialPath ? initialShouldHide : computedHide,
      showFooter: shouldShowFooter(path),
    }
  })
  const [isCollapsed, setIsCollapsed] = useState(false)

  useEffect(() => {
    const normalizedPath = stripLocalePrefix(pathname || "/")
    const hide = shouldHideNavbar(normalizedPath, searchParams)
    const showFooter = shouldShowFooter(normalizedPath)

    setShellState({
      shouldHide: hide,
      showFooter,
    })
  }, [pathname, searchParams])

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

  const shellContainerClass = shellState.shouldHide
    ? "flex min-h-screen flex-col"
    : isCollapsed
      ? "flex min-h-screen flex-col md:pl-(--sidebar-collapsed-width)"
      : "flex min-h-screen flex-col md:pl-(--sidebar-width)"

  const { suppress: suppressMobileNav } = useMobileNavSuppression()

  const content = (
    <div
      className={shellContainerClass}
      style={
        {
          "--app-shell-left-offset": shellState.shouldHide
            ? "0px"
            : isCollapsed
              ? "var(--sidebar-collapsed-width)"
              : "var(--sidebar-width)",
        } as React.CSSProperties
      }
    >
      {!shellState.shouldHide ? (
        <DesktopSidebar collapsed={isCollapsed} onToggleCollapsed={handleToggleCollapsed} />
      ) : null}
      <div className="flex flex-1 flex-col min-h-0">
        <main
          className={
            shellState.shouldHide
              ? "flex-1"
              : cn(
                  "flex-1 md:pb-0",
                  !suppressMobileNav && "pb-[calc(6.25rem+env(safe-area-inset-bottom))]"
                )
          }
        >
          <PageTransitionWrapper>{children}</PageTransitionWrapper>
        </main>
        {!shellState.shouldHide && shellState.showFooter ? <Footer /> : null}
      </div>
      {!shellState.shouldHide && !suppressMobileNav ? <MobileBottomNav /> : null}
    </div>
  )

  return <ModalProvider>{content}</ModalProvider>
}

export function NavbarProvider({
  children,
  initialShouldHide = false,
  initialPath = "",
}: {
  children: React.ReactNode
  initialShouldHide?: boolean
  initialPath?: string
}) {
  return (
    <MobileNavSuppressionProvider>
      <NavbarProviderInner initialShouldHide={initialShouldHide} initialPath={initialPath}>
        {children}
      </NavbarProviderInner>
    </MobileNavSuppressionProvider>
  )
}

