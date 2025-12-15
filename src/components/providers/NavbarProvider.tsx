"use client"

import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import NavbarNew from '@/components/homapage/NavbarNew'
import Footer from '@/components/homapage/Footer'

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

    const hideNavbarPaths = ['/board', '/test']
    const shouldHide = hideNavbarPaths.some(path => pathname.startsWith(path)) || pathname.includes('/tv')
    
    // Footer visibility logic
    const shownFooterPaths = ['/search', '/profile', '/club'];
    const shouldShowFooter = shownFooterPaths.some(path => pathname.startsWith(path)) || pathname === '/';
    
    // console.log("NavbarProvider - Pathname:", pathname, "Should Hide:", shouldHide, "Show Footer:", shouldShowFooter);
    
    setShouldHideNavbar(shouldHide)
    setShowFooter(shouldShowFooter)
  }, [pathname])

  return (
    <>
      {!shouldHideNavbar && (
        <>
          <NavbarNew />
          {/* Spacer to prevent content from being hidden behind fixed navbar */}
          <div className="h-16 md:h-20" />
        </>
      )}
      {children}
      {!shouldHideNavbar && showFooter && <Footer />}
    </>
  )
}

