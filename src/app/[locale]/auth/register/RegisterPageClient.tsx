"use client";
import { useState, useEffect } from 'react';
import RegisterFormNew from '@/components/auth/RegisterFormNew';
import VerifyEmail from '@/components/auth/VerifyEmail';
import { useRouter, useSearchParams } from 'next/navigation';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useUserContext } from '@/hooks/useUser';
import ParallaxBackground from '@/components/homapage/ParallaxBackground';
import { useTranslations } from 'next-intl';

export default function RegisterPageClient() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);
  const [redirectPath, setRedirectPath] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setUser } = useUserContext();
  const tr = useTranslations('Auth.register');
  const tv = useTranslations('Auth.verify');

  useEffect(() => {
    const redirect = searchParams.get('redirect') || searchParams.get('callbackUrl');
    if (redirect) {
      setRedirectPath(redirect);
    }
  }, [searchParams]);

  const handleRegister = async (data: {
    email: string;
    password: string;
    confirmPassword: string;
    name: string;
    username?: string;
  }) => {
    setIsLoading(true);
    setError(null);
    try {
      await toast.promise(
        axios.post('/api/auth/register', data, {
          headers: {
            'Content-Type': 'application/json',
          },
        }),
        {
          loading: tr('loading'),
          success: () => {
            setRegisteredEmail(data.email);
            return tr('success');
          },
          error: (error) => {
            console.error('Registration error:', error);
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
            return tr('error_generic');
          },
        }
      );
    } catch (registerError) {
      console.error('Register error:', registerError);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyEmail = async (data: { code: string }) => {
    setIsLoading(true);
    setError(null);
    try {
      await toast.promise(
        axios
          .post('/api/auth/verify-email', { email: registeredEmail, code: data.code }, {
            headers: {
              'Content-Type': 'application/json',
            },
          })
          .then(async (verifyResponse) => {
            if (verifyResponse.data.user) {
              setUser({
                _id: verifyResponse.data.user._id,
                username: verifyResponse.data.user.username,
                name: verifyResponse.data.user.name,
                email: verifyResponse.data.user.email,
                isAdmin: verifyResponse.data.user.isAdmin,
                isVerified: verifyResponse.data.user.isVerified,
              });

              if (redirectPath) {
                router.push(redirectPath);
              } else {
                router.push('/home');
              }
            }
          }),
        {
          loading: tv('loading'),
          success: () => tv('success'),
          error: (error) => {
            console.error('Verification error:', error);
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
            return tv('error_generic');
          },
        }
      );
    } catch (verifyError) {
      console.error('Verify email error:', verifyError);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      <ParallaxBackground />
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4 pt-8">
        {registeredEmail ? (
          <div className="w-full max-w-md">
            <VerifyEmail email={registeredEmail} onSubmit={handleVerifyEmail} isLoading={isLoading} />
            {error && <p className="text-destructive text-sm mt-4 text-center">{error}</p>}
          </div>
        ) : (
          <div className="w-full max-w-md">
            <RegisterFormNew
              onSubmit={handleRegister}
              isLoading={isLoading}
              redirectPath={redirectPath}
              error={error || undefined}
            />
          </div>
        )}
      </div>
    </div>
  );
}
