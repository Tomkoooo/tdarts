"use client";
import { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useUserContext } from './useUser';
import axios from 'axios';

export const useAuthSync = () => {
  const { data: session, status } = useSession();
  const { user, setUser } = useUserContext();
  const syncedRef = useRef(false);

  useEffect(() => {
    const syncAuth = async () => {
      console.log('AuthSync - Effect triggered:', {
        hasSession: !!session?.user,
        hasUser: !!user,
        status,
        sessionUser: session?.user ? { email: session.user.email, name: session.user.name } : null
      });
      
      // Always try to sync if there's a NextAuth session but no JWT token in context
      if (session?.user && status === 'authenticated' && !syncedRef.current) {
        console.log('AuthSync - NextAuth session found, syncing with context:', session.user);
        syncedRef.current = true;
        
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
        }
      }
      
      // Ha nincs NextAuth session és van user a context-ben, akkor töröljük
      // DE csak akkor, ha a user Google OAuth-val jelentkezett be
      if (!session && user && status === 'unauthenticated') {
        // Ellenőrizzük, hogy a user Google OAuth-val jelentkezett be
        // Ha igen, akkor töröljük, ha nem, akkor megtartjuk (manuális bejelentkezés)
        console.log('AuthSync - No NextAuth session, but keeping user in context (manual login)');
        // setUser(undefined); // Kommenteltük ki, hogy ne törölje a manuális bejelentkezést
      }
    };

    syncAuth();
  }, [session, user, setUser, status]);

  return { session, user, status };
};
