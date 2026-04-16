"use client";
import { useState, useEffect } from 'react';
import RegisterFormNew from '@/components/auth/RegisterFormNew';
import { useSearchParams } from 'next/navigation';
import ParallaxBackground from '@/components/homapage/ParallaxBackground';

export default function RegisterPageClient() {
  const [redirectPath, setRedirectPath] = useState<string | null>(null);
  const searchParams = useSearchParams();

  useEffect(() => {
    const redirect = searchParams.get('redirect') || searchParams.get('callbackUrl');
    if (redirect) {
      setRedirectPath(redirect);
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen relative overflow-hidden">
      <ParallaxBackground />
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4 pt-8">
        <div className="w-full max-w-md">
          <RegisterFormNew redirectPath={redirectPath} />
        </div>
      </div>
    </div>
  );
}
