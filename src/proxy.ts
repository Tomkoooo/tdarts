import createMiddleware from "next-intl/middleware";
import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);

export default async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Fast auth-aware gate for localized root pages:
  // if auth cookie exists, jump directly to /:locale/home.
  const localeRootMatch = pathname.match(/^\/(hu|en|de)\/?$/);
  if (localeRootMatch) {
    const locale = localeRootMatch[1];
    const hasAuthCookie = Boolean(
      request.cookies.get("token")?.value ||
        request.cookies.get("next-auth.session-token")?.value ||
        request.cookies.get("__Secure-next-auth.session-token")?.value ||
        request.cookies.get("authjs.session-token")?.value ||
        request.cookies.get("__Secure-authjs.session-token")?.value
    );
    if (hasAuthCookie) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = `/${locale}/home`;
      return NextResponse.redirect(redirectUrl);
    }
  }

  const response = intlMiddleware(request);
  response.headers.set("x-pathname", pathname);
  return response;
}

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
