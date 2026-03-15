"use client"

import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import NavbarNew from '@/components/homapage/NavbarNew'
import Footer from '@/components/homapage/Footer'
import { DesktopSidebar } from '@/components/layout/DesktopSidebar'
import { MobileBottomNav } from '@/components/layout/MobileBottomNav'
import { stripLocalePrefix } from "@/lib/seo"

export function NavbarProvider({ 
  children, 
  initialShouldHide = false 
}: { 
  children: React.ReactNode
  initialShouldHide?: boolean 
}) {
  const pathname = usePathname()
  const [shouldHideNavbar, setShouldHideNavbar] = useState(initialShouldHide)
  const [showFooter, setShowFooter] = useState(false)
  const [useNewLayout, setUseNewLayout] = useState(false)

  useEffect(() => {
    if (!pathname) return;

    const normalizedPath = stripLocalePrefix(pathname);

    const hideNavbarPaths = ['/board', '/test', '/tv', '/api/admin']
    const shouldHide = hideNavbarPaths.some(path => normalizedPath.startsWith(path)) || normalizedPath.includes('/tv')
    
    // Use new layout (sidebar + bottom nav) for these paths
    const newLayoutPaths = ['/tournaments', '/clubs', '/statistics', '/profile', '/settings']
    const useNew = newLayoutPaths.some(path => normalizedPath.startsWith(path))
    
    // Footer visibility logic
    const shownFooterPaths = ['/search', '/profile', '/club'];
    const shouldShowFooter =
      shownFooterPaths.some(path => normalizedPath.startsWith(path)) || normalizedPath === '/';

    setShouldHideNavbar(shouldHide)
    setShowFooter(shouldShowFooter)
    setUseNewLayout(useNew)
  }, [pathname])

  if (shouldHideNavbar) {
    return (
      <main className="flex-1">
        {children}
      </main>
    )
  }

  if (useNewLayout) {
    return (
      <div className="flex flex-col min-h-screen md:pl-64">
        <DesktopSidebar />
        <main className="flex-1 pb-20 md:pb-0">
          {children}
        </main>
        <MobileBottomNav />
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <>
        <NavbarNew />
        {/* Spacer to prevent content from being hidden behind fixed navbar */}
        <div className="h-16 md:h-20" />
      </>
      <main className="flex-1">
        {children}
      </main>
      {showFooter && <Footer />}
    </div>
  )
}

