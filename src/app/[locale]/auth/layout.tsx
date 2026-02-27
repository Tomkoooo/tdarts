"use client";
import { useEffect, useMemo, useRef } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useUserContext } from '@/hooks/useUser';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useUserContext();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const hasRedirectedRef = useRef(false);
  const redirectTarget = useMemo(() => searchParams.get('redirect') || '/', [searchParams]);

  useEffect(() => {
    // If user is logged in, redirect once and avoid extra history entries.
    if (!user || hasRedirectedRef.current) return;
    if (redirectTarget === pathname) return;

    hasRedirectedRef.current = true;
    router.replace(redirectTarget);
  }, [pathname, redirectTarget, router, user]);

  useEffect(() => {
    if (!user) {
      hasRedirectedRef.current = false;
    }
  }, [user]);

  // If user is logged in, don't render the auth pages
  if (user) {
    return null;
  }

  return <>{children}</>;
}
