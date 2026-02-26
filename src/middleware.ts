import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

export default createMiddleware(routing);

export const config = {
  // Match all pathnames except for
  // - API routes
  // - Static files (_next/static, images, etc.)
  // - Metadata files (favicon.ico, sitemap.xml, etc.)
  matcher: ['/((?!api|_next|.*\\..*).*)']
};
