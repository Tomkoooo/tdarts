"use client";
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from '@/i18n/routing';
import { useSearchParams } from 'next/navigation';
import axios from 'axios';
import { useUserContext } from '@/hooks/useUser';
import GoogleAccountLinkModal from '@/components/auth/GoogleAccountLinkModal';
import { useTranslations } from 'next-intl';

export default function GoogleCallbackPageClient() {
  const t = useTranslations('Auth.googleCallback');
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
        setError(t('loginFailed'));
        setLoading(false);
        return;
      }

      if (session?.user) {
        try {
          const response = await axios.post('/api/auth/google-callback');

          if (response.data.success) {
            const apiUser = response.data.user;
            setUser({
              _id: apiUser._id,
              username: apiUser.username,
              name: apiUser.name,
              email: apiUser.email,
              isAdmin: apiUser.isAdmin,
              isVerified: apiUser.isVerified,
              profilePicture: apiUser.profilePicture,
              country: apiUser.country ?? null,
              locale: apiUser.locale,
              termsAcceptedAt: apiUser.termsAcceptedAt ?? null,
              needsProfileCompletion: Boolean(apiUser.needsProfileCompletion),
            });

            if (apiUser.needsProfileCompletion) {
              router.push('/auth/complete-profile');
            } else {
              const redirect = searchParams.get('redirect') || '/home';
              router.push(redirect);
            }
          } else {
            setError(t('loginError'));
          }
        } catch (callbackError: unknown) {
          console.error('Google OAuth callback error:', callbackError);
          if (
            callbackError &&
            typeof callbackError === 'object' &&
            'response' in callbackError &&
            callbackError.response &&
            typeof callbackError.response === 'object' &&
            'data' in callbackError.response &&
            callbackError.response.data &&
            typeof callbackError.response.data === 'object' &&
            'error' in callbackError.response.data &&
            (callbackError.response.data as { error?: string }).error === 'User not found'
          ) {
            setShowLinkModal(true);
          } else if (
            callbackError &&
            typeof callbackError === 'object' &&
            'response' in callbackError &&
            callbackError.response &&
            typeof callbackError.response === 'object' &&
            'data' in callbackError.response &&
            callbackError.response.data &&
            typeof callbackError.response.data === 'object' &&
            'error' in callbackError.response.data &&
            typeof (callbackError.response.data as { error?: string }).error === 'string'
          ) {
            setError((callbackError.response.data as { error: string }).error);
          } else {
            setError('Hiba történt a bejelentkezés során');
          }
        }
      }

      setLoading(false);
    };

    void handleGoogleAuth();
  }, [session, status, router, searchParams, setUser, t]);

  useEffect(() => {
    const err = searchParams.get('error');
    if (err === 'OAuthAccountNotLinked') {
      setShowLinkModal(true);
      setLoading(false);
    }
  }, [searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="loading loading-spinner loading-lg text-primary mb-4"></div>
          <p className="text-lg">{t('processing')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-error text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-error mb-4">{t('errorTitle')}</h1>
          <p className="text-base-content/70 mb-6">{error}</p>
          <button type="button" onClick={() => router.push('/auth/login')} className="btn btn-primary">
            {t('backToLogin')}
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
