"use client";
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import axios from 'axios';
import { useUserContext } from '@/hooks/useUser';
import GoogleAccountLinkModal from '@/components/auth/GoogleAccountLinkModal';

export default function GoogleCallbackPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setUser } = useUserContext();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showLinkModal, setShowLinkModal] = useState(false);

  useEffect(() => {
    const handleGoogleAuth = async () => {
      if (status === 'loading') return;
      
      if (status === 'unauthenticated') {
        setError('Google bejelentkezés sikertelen');
        setLoading(false);
        return;
      }

      if (session?.user) {
        try {
          console.log('Google OAuth session:', session);
          
          // Hívjuk meg a Google OAuth API-t
          const response = await axios.post('/api/auth/google');
          
          console.log('Google OAuth API response:', response.data);
          
          if (response.data.success) {
            // Frissítjük a user context-et
            setUser(response.data.user);
            
            // Átirányítás
            const redirect = searchParams.get('redirect') || '/';
            router.push(redirect);
          } else {
            setError('Hiba történt a bejelentkezés során');
          }
        } catch (error: any) {
          console.error('Google OAuth callback error:', error);
          if (error.response?.data?.error === 'User not found') {
            // Ha nincs felhasználó, akkor új fiókot kell létrehozni
            setShowLinkModal(true);
          } else {
            setError(error.response?.data?.error || 'Hiba történt a bejelentkezés során');
          }
        }
      }
      
      setLoading(false);
    };

    handleGoogleAuth();
  }, [session, status, router, searchParams, setUser]);

  // Ha van hiba a URL-ben (pl. OAuthAccountNotLinked)
  useEffect(() => {
    const error = searchParams.get('error');
    if (error === 'OAuthAccountNotLinked') {
      setShowLinkModal(true);
      setLoading(false);
    }
  }, [searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="loading loading-spinner loading-lg text-primary mb-4"></div>
          <p className="text-lg">Google bejelentkezés feldolgozása...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-error text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-error mb-4">Bejelentkezési hiba</h1>
          <p className="text-base-content/70 mb-6">{error}</p>
          <button 
            onClick={() => router.push('/auth/login')}
            className="btn btn-primary"
          >
            Vissza a bejelentkezéshez
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {showLinkModal && session?.user && (
        <GoogleAccountLinkModal
          isOpen={showLinkModal}
          onClose={() => {
            setShowLinkModal(false);
            router.push('/auth/login');
          }}
          googleEmail={session.user.email || ''}
          googleName={session.user.name || ''}
        />
      )}
    </>
  );
}
