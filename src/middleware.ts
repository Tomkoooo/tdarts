import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { DEFAULT_LOCALE, SUPPORTED_LOCALES, stripLocalePrefix } from '@/lib/seo'

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const [, maybeLocale] = pathname.split('/')
  const isLocalizedPath = SUPPORTED_LOCALES.includes(maybeLocale as (typeof SUPPORTED_LOCALES)[number])

  // Rewrites /hu/**, /en/**, /de/** to existing app routes while preserving the locale in a header.
  if (isLocalizedPath) {
    const rewrittenUrl = request.nextUrl.clone()
    rewrittenUrl.pathname = stripLocalePrefix(pathname)
    const response = NextResponse.rewrite(rewrittenUrl)
    response.headers.set('x-pathname', rewrittenUrl.pathname)
    response.headers.set('x-locale', maybeLocale || DEFAULT_LOCALE)
    return response
  }

  // Add pathname to headers for server-side access
  const response = NextResponse.next()
  response.headers.set('x-pathname', pathname)
  response.headers.set('x-locale', DEFAULT_LOCALE)
  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
