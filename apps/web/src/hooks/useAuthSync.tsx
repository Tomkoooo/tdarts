"use client";
import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useUserContext } from './useUser';
import axios from 'axios';

const syncedSessionUsers = new Set<string>();

export const useAuthSync = () => {
  const { data: session, status } = useSession();
  const { setUser } = useUserContext();
  const sessionEmail = session?.user?.email || '';

  useEffect(() => {
    const syncAuth = async () => {
      console.log('AuthSync - Effect triggered:', {
        hasSession: !!session?.user,
        status,
        sessionUser: session?.user ? { email: session.user.email, name: session.user.name } : null
      });
      
      // In dev StrictMode, effects remount; keep sync idempotent per session email.
      if (session?.user && status === 'authenticated' && sessionEmail && !syncedSessionUsers.has(sessionEmail)) {
        console.log('AuthSync - NextAuth session found, syncing with context:', session.user);
        syncedSessionUsers.add(sessionEmail);
        
        try {
          // Hívjuk meg a Google OAuth callback API-t a JWT token generálásához
          console.log('AuthSync - Calling /api/auth/google-callback POST');
          const response = await axios.post('/api/auth/google-callback');
          
          if (response.data.success) {
            setUser(response.data.user);
            console.log('AuthSync - User synced to context:', response.data.user._id);
            console.log('AuthSync - JWT token should now be set in cookies');
          } else {
            console.log('AuthSync - Response not successful:', response.data);
          }
        } catch (error: any) {
          console.error('AuthSync - Error syncing user:', error);
          
          // Ha a felhasználó nem található, akkor új fiókot kell létrehozni
          if (error.response?.data?.error === 'User not found') {
            console.log('AuthSync - User not found, creating new user...');
            // Itt lehetne egy modal-t megjeleníteni a fiók létrehozásához
          }
          syncedSessionUsers.delete(sessionEmail);
        }
      }
    };

    syncAuth();
  }, [session, sessionEmail, setUser, status]);

  return { session, status };
};
