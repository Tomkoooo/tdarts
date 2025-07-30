"use client";
import React from 'react';
import ForgotPasswordForm from '@/components/auth/ForgotPasswordForm';
import ParallaxBackground from '@/components/homapage/ParallaxBackground';
import { IconArrowLeft } from '@tabler/icons-react';
import Link from 'next/link';

const ForgotPassword: React.FC = () => {

  return (
    <div className="min-h-screen relative overflow-hidden">
      <ParallaxBackground />
      <div className="absolute top-6 left-6 z-20">
        <Link
          href="/auth/login"
          className="flex items-center space-x-2 text-muted-foreground hover:text-foreground transition-colors group"
        >
          <IconArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span className="group-hover:text-primary group-hover:underline transition-transform">
            Vissza a bejelentkezéshez
          </span>
        </Link>
      </div>
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <ForgotPasswordForm isLoading={false} />
      </div>
    </div>
  );
};

export default ForgotPassword;