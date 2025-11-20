"use client"

import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import NavbarNew from '@/components/homapage/NavbarNew'

export function NavbarProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [shouldHideNavbar, setShouldHideNavbar] = useState(false)

  useEffect(() => {
    const hideNavbarPaths = ['/board', '/test']
    const shouldHide = hideNavbarPaths.some(path => pathname.startsWith(path))
    setShouldHideNavbar(shouldHide)
    
    // Update body padding dynamically
    const body = document.body
    if (shouldHide) {
      body.classList.remove('pt-16', 'md:pt-20')
    } else {
      body.classList.add('pt-16', 'md:pt-20')
    }
  }, [pathname])

  return (
    <>
      {!shouldHideNavbar && <NavbarNew />}
      {children}
    </>
  )
}

