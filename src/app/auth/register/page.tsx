"use client";
import { useState, useEffect } from 'react';
import RegisterForm from '@/components/auth/RegisterForm';
import VerifyEmail from '@/components/auth/VerifyEmail';
import { useRouter, useSearchParams } from 'next/navigation';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useUserContext } from '@/hooks/useUser';

// Regisztrációs oldal, amely a regisztrációt és az email verifikációt kezeli
export default function RegisterPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);
  const [redirectPath, setRedirectPath] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setUser } = useUserContext();

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
          loading: 'Regisztráció folyamatban...',
          success: () => {
            setRegisteredEmail(data.email); // Átváltás a verifikációs űrlapra
            return 'Sikeres regisztráció! Ellenőrizd az email címedet a verifikációs kódért.';
          },
          error: (error) => {
            console.error('Registration error:', error);
            if (error.response && error.response.data.error) {
              return error.response.data.error; // Szerver válaszból származó hiba
            }
            return 'Hiba történt a regisztráció során'; // Általános hibaüzenet
          },
        }
      );
    } catch (error) {
      // A toast.promise kezeli a hibákat, így itt nincs szükség további logikára
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
          // After successful email verification, automatically log in the user
          if (verifyResponse.data.user) {
            // Set user in context
            setUser({
              _id: verifyResponse.data.user._id,
              username: verifyResponse.data.user.username,
              name: verifyResponse.data.user.name,
              email: verifyResponse.data.user.email,
              isAdmin: verifyResponse.data.user.isAdmin,
              isVerified: verifyResponse.data.user.isVerified,
            });
            
            // Navigate to redirect path or default to home
            if (redirectPath) {
              router.push(redirectPath);
            } else {
              router.push('/search');
            }
          }
        }),
        {
          loading: 'Verifikáció folyamatban...',
          success: () => {
            return 'Email sikeresen verifikálva! Automatikus bejelentkezés...';
          },
          error: (error) => {
            console.error('Verification error:', error);
            if (error.response && error.response.data.error) {
              return error.response.data.error; // Szerver válaszból származó hiba
            }
            return 'Hiba történt a verifikáció során'; // Általános hibaüzenet
          },
        }
      );
    } catch (error) {
      // A toast.promise kezeli a hibákat, így itt nincs szükség további logikára
      console.error('Verify email error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 pt-8">
      {registeredEmail ? (
        <div className="w-full max-w-md">
          <VerifyEmail
            email={registeredEmail}
            onSubmit={handleVerifyEmail}
            isLoading={isLoading}
          />
          {error && (
            <p className="text-[hsl(var(--destructive))] text-sm mt-4 text-center">
              {error}
            </p>
          )}
        </div>
      ) : (
        <div className="w-full max-w-md">
          <RegisterForm
            onSubmit={handleRegister}
            isLoading={isLoading}
            redirectPath={redirectPath}
          />
          {error && (
            <p className="text-[hsl(var(--destructive))] text-sm mt-4 text-center">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}