"use client";
// import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { useUserContext } from './useUser';
import { logoutAction } from '@/features/profile/actions';

export const useLogout = () => {
  // const router = useRouter();
  const { setUser } = useUserContext();

  const logout = async () => {
    try {
      console.log('Logout - Starting logout process...');
      
      // 1. Hívjuk meg a saját logout action-t
      try {
        await logoutAction();
        console.log('Logout - Server logout completed');
      } catch (error) {
        console.error('Logout - Server logout error:', error);
        // Folytatjuk a NextAuth logout-tal is
      }
      
      // 2. Töröljük a NextAuth session-t
      try {
        await signOut({ 
          redirect: false, // Ne irányítson át automatikusan
          callbackUrl: '/auth/login'
        });
        console.log('Logout - NextAuth session cleared');
        
        // További session cleanup - force refresh
        setTimeout(() => {
          window.location.href = '/auth/login';
        }, 100);
      } catch (error) {
        console.error('Logout - NextAuth signOut error:', error);
        // Ha a signOut nem működik, force redirect
        window.location.href = '/auth/login';
      }
      
      // 3. Töröljük a user context-et
      setUser(undefined);
      console.log('Logout - User context cleared');
      
      // 4. Átirányítás a login oldalra (force redirect)
      console.log('Logout - Redirecting to login page');
      window.location.href = '/auth/login';
      
    } catch (error) {
      console.error('Logout - Unexpected error:', error);
      // Még mindig töröljük a context-et és irányítsunk át
      setUser(undefined);
      window.location.href = '/auth/login';
    }
  };

  return { logout };
};
