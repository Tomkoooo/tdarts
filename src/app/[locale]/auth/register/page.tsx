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

// Regisztrációs oldal, amely a regisztrációt és az email verifikációt kezeli
export default function RegisterPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);
  const [redirectPath, setRedirectPath] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setUser } = useUserContext();
  const tr = useTranslations('Auth.register');
  const tv = useTranslations('Auth.verify');

  // Get redirect parameter from URL
  useEffect(() => {
    const redirect = searchParams.get('redirect');
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
            setRegisteredEmail(data.email); // Átváltás a verifikációs űrlapra
            return tr('success');
          },
          error: (error) => {
            console.error('Registration error:', error);
            if (error.response && error.response.data.error) {
              return error.response.data.error; // Szerver válaszból származó hiba
            }
            return tr('error_generic'); // Általános hibaüzenet
          },
        }
      );
    } catch (error) {
      console.error('Register error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyEmail = async (data: { code: string }) => {
    console.log('Verify email data:', { email: registeredEmail, code: data.code });
    setIsLoading(true);
    setError(null);
    try {
      await toast.promise(
        axios.post('/api/auth/verify-email', { email: registeredEmail, code: data.code }, {
          headers: {
            'Content-Type': 'application/json',
          },
        }).then(async (verifyResponse) => {
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
              router.push('/search');
            }
          }
        }),
        {
          loading: tv('loading'),
          success: () => {
            return tv('success');
          },
          error: (error) => {
            console.error('Verification error:', error);
            if (error.response && error.response.data.error) {
              return error.response.data.error; // Szerver válaszból származó hiba
            }
            return tv('error_generic'); // Általános hibaüzenet
          },
        }
      );
    } catch (error) {
      console.error('Verify email error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Parallax Background */}
      <ParallaxBackground />
      
      {/* Registration Form Container */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4 pt-8">
      {registeredEmail ? (
        <div className="w-full max-w-md">
          <VerifyEmail
            email={registeredEmail}
            onSubmit={handleVerifyEmail}
            isLoading={isLoading}
          />
          {error && (
              <p className="text-destructive text-sm mt-4 text-center">
              {error}
            </p>
          )}
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