"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUserContext } from '@/hooks/useUser';
import axios from 'axios';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { user } = useUserContext();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [adminLoading, setAdminLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkAdminStatus = async () => {
      setAdminLoading(true);
      if (!user) {
        // Not logged in, redirect to login with return URL
        setAdminLoading(false);
        router.push(`/auth/login?redirect=${encodeURIComponent('/admin')}`);
        return;
      }

      try {
        // Check if user is admin
        const response = await axios.get('/api/admin/check-status');
        setIsAdmin(response.data.isAdmin);
        
        if (!response.data.isAdmin) {
          // User is logged in but not admin, redirect to profile
          setAdminLoading(false);
          router.push('/profile');
          return;
        }
      } catch (error) {
        setAdminLoading(false);
        console.error('Error checking admin status:', error);
        router.push('/profile');
        return;
      } finally {
        setAdminLoading(false);
      }
    };

    if (user) {
      checkAdminStatus();
    }
  }, [user]);

  // Show loading while checking admin status
  if (adminLoading || isAdmin === null || !user) {
    return (
      <div className="min-h-screen bg-base-100 flex items-center justify-center">
        <div className="text-center">
          <div className="loading loading-spinner loading-lg"></div>
          <p className="mt-4 text-base-content/60">Admin jogosultság ellenőrzése...</p>
        </div>
      </div>
    );
  }

  // If not admin, don't render anything (redirect is handled above)
  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-base-100">
      {/* Main Content */}
      <div className="container mx-auto px-4 py-6 pt-24">
        {children}
      </div>
    </div>
  );
}
