"use client";
import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useUserContext } from './useUser';
import axios from 'axios';

export const useAuthSync = () => {
  const { data: session, status } = useSession();
  const { user, setUser } = useUserContext();

  useEffect(() => {
    const syncAuth = async () => {
      // Ha van NextAuth session, de nincs user a context-ben
      if (session?.user && !user && status === 'authenticated') {
        console.log('AuthSync - NextAuth session found, syncing with context:', session.user);
        
        try {
          // Hívjuk meg a Google OAuth callback API-t a JWT token generálásához
          const response = await axios.post('/api/auth/google-callback');
          
          if (response.data.success) {
            setUser(response.data.user);
            console.log('AuthSync - User synced to context:', response.data.user._id);
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
      if (!session && user && status === 'unauthenticated') {
        console.log('AuthSync - No NextAuth session, clearing user from context');
        setUser(undefined);
      }
      
      // Ha van NextAuth session, de a user context-ben nincs, akkor szinkronizáljuk
      if (session?.user && !user && status === 'authenticated') {
        console.log('AuthSync - NextAuth session exists but no user in context, syncing...');
        // Ez a fenti logika már kezeli ezt az esetet
      }
    };

    syncAuth();
  }, [session, user, setUser, status]);

  return { session, user, status };
};
