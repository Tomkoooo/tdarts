"use client";
import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUserContext } from '@/hooks/useUser';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useUserContext();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // If user is logged in, redirect them
    if (user) {
      const redirect = searchParams.get('redirect');
      if (redirect) {
        router.push(redirect);
      } else {
        router.push('/');
      }
    }
  }, [user, router, searchParams]);

  // If user is logged in, don't render the auth pages
  if (user) {
    return null;
  }

  return <>{children}</>;
}
