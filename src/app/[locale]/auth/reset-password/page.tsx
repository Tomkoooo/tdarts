"use client";
import React from 'react';
import ResetPasswordFormNew from '@/components/auth/ResetPasswordFormNew';
import ParallaxBackground from '@/components/homapage/ParallaxBackground';

const ResetPassword: React.FC = () => {
  return (
    <div className="min-h-screen relative overflow-hidden">
      <ParallaxBackground />
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4 pt-8">
        <ResetPasswordFormNew />
      </div>
    </div>
  );
};

export default ResetPassword;