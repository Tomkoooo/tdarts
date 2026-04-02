"use client";
import { signOut } from 'next-auth/react';
import { useUserContext } from './useUser';
import { logoutAction } from '@/features/profile/actions';

export const useLogout = () => {
  const { setUser } = useUserContext();

  const logout = async () => {
    try {
      try {
        await logoutAction();
      } catch (error) {
      }
      
      setUser(undefined);

      try {
        await signOut({ 
          redirect: false,
          callbackUrl: '/auth/login'
        });
      } catch {
      }
      window.location.href = '/auth/login';
      
    } catch {
      setUser(undefined);
      window.location.href = '/auth/login';
    }
  };

  return { logout };
};
