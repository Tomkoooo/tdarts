"use client";
import { useState } from 'react';
import RegisterForm from '@/components/auth/RegisterForm';
import VerifyEmail from '@/components/auth/VerifyEmail';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import toast from 'react-hot-toast';

// Regisztrációs oldal, amely a regisztrációt és az email verifikációt kezeli
export default function RegisterPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);
  const router = useRouter();

  const handleRegister = async (data: {
    email: string;
    password: string;
    name: string;
    username?: string;
  }) => {
    console.log('Register data:', data);
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
        }),
        {
          loading: 'Verifikáció folyamatban...',
          success: () => {
            router.push('/auth/login'); // Navigálás a bejelentkezési oldalra
            return 'Email sikeresen verifikálva!';
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
    <div className="min-h-screen flex items-center justify-center bg-background">
      {registeredEmail ? (
        <div>
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
        <div>
          <RegisterForm
            onSubmit={handleRegister}
            onLogin={() => router.push('/auth/login')}
            isLoading={isLoading}
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