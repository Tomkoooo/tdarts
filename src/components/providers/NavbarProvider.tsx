"use client"

import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import NavbarNew from '@/components/homapage/NavbarNew'
import Footer from '@/components/homapage/Footer'
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

  useEffect(() => {
    if (!pathname) return;

    const normalizedPath = stripLocalePrefix(pathname);

    const hideNavbarPaths = ['/board', '/test', '/tv', '/api/admin']
    const shouldHide = hideNavbarPaths.some(path => normalizedPath.startsWith(path)) || normalizedPath.includes('/tv')
    
    // Footer visibility logic
    const shownFooterPaths = ['/search', '/profile', '/club'];
    const shouldShowFooter =
      shownFooterPaths.some(path => normalizedPath.startsWith(path)) || normalizedPath === '/';

      console.log("NavbarProvider - Normalized Path:", normalizedPath, "Should Show Footer:", shouldShowFooter, "should hide:", shouldHide);
    
    // console.log("NavbarProvider - Pathname:", pathname, "Should Hide:", shouldHide, "Show Footer:", shouldShowFooter);
    
    setShouldHideNavbar(shouldHide)
    setShowFooter(shouldShowFooter)
  }, [pathname])

  return (
    <div className="flex flex-col min-h-screen">
      {!shouldHideNavbar && (
        <>
          <NavbarNew />
          {/* Spacer to prevent content from being hidden behind fixed navbar */}
          <div className="h-16 md:h-20" />
        </>
      )}
      <main className="flex-1">
        {children}
      </main>
      {!shouldHideNavbar && showFooter && <Footer />}
    </div>
  )
}

