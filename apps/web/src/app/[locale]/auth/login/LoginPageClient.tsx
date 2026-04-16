"use client";
import React, { useEffect, useState } from 'react';
import LoginFormNew from '@/components/auth/LoginFormNew';
import ParallaxBackground from '@/components/homapage/ParallaxBackground';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useSearchParams } from 'next/navigation';
import { useRouter } from '@/i18n/routing';
import { useUserContext } from '@/hooks/useUser';
import { useTranslations } from 'next-intl';

export default function LoginPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setUser } = useUserContext();
  const [redirectPath, setRedirectPath] = useState<string | null>(null);

  useEffect(() => {
    const redirect = searchParams.get('redirect') || searchParams.get('callbackUrl');
    if (redirect) {
      setRedirectPath(redirect);
    }
  }, [searchParams]);

  const t = useTranslations('Auth.login');

  const handleLogin = async (data: { email: string; password: string }) => {
    await toast.promise(
      axios.post('/api/auth/login', data, {
        headers: {
          'Content-Type': 'application/json',
        },
      }),
      {
        loading: t('submitting'),
        success: (response) => {
          const user = response.data.user;
          setUser({
            _id: user._id,
            username: user.username,
            name: user.name,
            email: user.email,
            isAdmin: user.isAdmin,
            isVerified: user.isVerified,
            country: user.country ?? null,
            locale: user.locale,
            termsAcceptedAt: user.termsAcceptedAt ?? null,
            needsProfileCompletion: Boolean(user.needsProfileCompletion),
          });

          if (user.needsProfileCompletion) {
            router.push('/auth/complete-profile');
          } else if (redirectPath) {
            router.push(redirectPath);
          } else {
            router.push('/home');
          }

          return t('success');
        },
        error: (error: unknown) => {
          console.error('Login error:', error);
          if (
            error &&
            typeof error === 'object' &&
            'response' in error &&
            error.response &&
            typeof error.response === 'object' &&
            'data' in error.response &&
            error.response.data &&
            typeof error.response.data === 'object' &&
            'error' in error.response.data &&
            typeof (error.response.data as { error?: string }).error === 'string'
          ) {
            return (error.response.data as { error: string }).error;
          }
          return t('error_generic');
        },
      }
    );
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      <ParallaxBackground />
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4 pt-8">
        <div className="w-full max-w-md">
          <LoginFormNew onSubmit={handleLogin} redirectPath={redirectPath} />
        </div>
      </div>
    </div>
  );
}
