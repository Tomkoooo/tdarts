"use client";
import React from 'react';
import ForgotPasswordFormNew from '@/components/auth/ForgotPasswordFormNew';
import ParallaxBackground from '@/components/homapage/ParallaxBackground';

const ForgotPassword: React.FC = () => {

  return (
    <div className="min-h-screen relative overflow-hidden">
      <ParallaxBackground />
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4 pt-8">
        <ForgotPasswordFormNew />
      </div>
    </div>
  );
};

export default ForgotPassword;