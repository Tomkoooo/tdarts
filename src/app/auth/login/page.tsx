"use client";
import React, { useEffect, useState } from 'react';
import LoginForm from '@/components/auth/LoginForm';
import ParallaxBackground from '@/components/homapage/ParallaxBackground';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUserContext } from '@/hooks/useUser';

const Login: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setUser } = useUserContext();
  const [redirectPath, setRedirectPath] = useState<string | null>(null);

  // Get redirect parameter from URL
  useEffect(() => {
    const redirect = searchParams.get('redirect');
    if (redirect) {
      setRedirectPath(redirect);
    }
  }, [searchParams]);

  const handleLogin = async (data: { email: string; password: string }) => {
    console.log('Login data:', data);
    
    await toast.promise(
      axios.post('/api/auth/login', data, {
        headers: {
          'Content-Type': 'application/json',
        },
      }),
      {
        loading: 'Bejelentkezés...',
        success: (response) => {
          // Extract the user from the response and set it in the context
          const user = response.data.user;
          setUser({
            _id: user._id,
            username: user.username,
            name: user.name,
            email: user.email,
            isAdmin: user.isAdmin,
            isVerified: user.isVerified,
          });

          // Navigate to redirect path or default to home
          if (redirectPath) {
            router.push(redirectPath);
          } else {
            router.push('/search'); // Navigate to the home page
          }
          
          return 'Sikeres bejelentkezés!';
        },
        error: (error: any) => {
          console.error('Login error:', error);
          if (error.response && error.response.data.error) {
            return error.response.data.error; // Error from the server response
          } else {
            return 'Hiba történt a bejelentkezés során'; // General error message
          }
        },
      }
    );
  };

  const handleForgotPassword = () => {
    console.log('Forgot password clicked');
    // Implement forgot password logic
  };

  const handleSignUp = () => {
    console.log('Sign up clicked');
    // Navigate to register with redirect parameter if present
    const registerUrl = redirectPath ? `/auth/register?redirect=${encodeURIComponent(redirectPath)}` : '/auth/register';
    router.push(registerUrl);
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Parallax Background */}
      <ParallaxBackground />

      {/* Login Form Container */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4 pt-8">
        <div className="w-full max-w-md">
          <LoginForm
            onSubmit={handleLogin}
            onForgotPassword={handleForgotPassword}
            onSignUp={handleSignUp}
            redirectPath={redirectPath}
          />
        </div>
      </div>
    </div>
  );
};

export default Login;
