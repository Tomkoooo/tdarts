"use client"

import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import NavbarNew from '@/components/homapage/NavbarNew'

export function NavbarProvider({ 
  children, 
  initialShouldHide = false 
}: { 
  children: React.ReactNode
  initialShouldHide?: boolean 
}) {
  const pathname = usePathname()
  const [shouldHideNavbar, setShouldHideNavbar] = useState(initialShouldHide)

  useEffect(() => {
    if (!pathname) return;

    const hideNavbarPaths = ['/board', '/test']
    const shouldHide = hideNavbarPaths.some(path => pathname.startsWith(path)) || pathname.includes('/tv')
    
    console.log("NavbarProvider - Pathname:", pathname, "Should Hide:", shouldHide);
    
    setShouldHideNavbar(shouldHide)
    // Removed body class manipulation to avoid conflicts with React hydration
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
    </>
  )
}

