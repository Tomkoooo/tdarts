"use client";
import React from 'react';
import LoginForm from '@/components/auth/LoginForm';
import ParallaxBackground from '@/components/homapage/ParallaxBackground';
import { IconArrowLeft } from '@tabler/icons-react';
import Link from 'next/link';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { useUserContext } from '@/hooks/useUser';

const Login: React.FC = () => {
  const router = useRouter();
  const { setUser } = useUserContext();

  const handleLogin = async (data: { email: string; password: string }) => {
    console.log('Login data:', data);
    try {
      await toast.promise(
        axios.post('/api/auth/login', data, {
          headers: {
            'Content-Type': 'application/json',
          },
        }).then((response) => {
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
        }),
        //TODO: nem állítja be a felhasználót a contextben, mert a promise-t nem várja meg
        {
          loading: 'Bejelentkezés folyamatban...',
          success: () => {
            router.push('/'); // Navigate to the home page
            return 'Sikeres bejelentkezés!';
          },
          error: (error) => {
            console.error('Login error:', error);
            if (error.response && error.response.data.error) {
              return error.response.data.error; // Error from the server response
            }
            return 'Hiba történt a bejelentkezés során'; // General error message
          },
        }
      );
    } catch (error) {
      // toast.promise handles errors, so no additional logic is needed here
      console.error('Login error:', error);
    }
  };

  const handleForgotPassword = () => {
    console.log('Forgot password clicked');
    // Implement forgot password logic
  };

  const handleSignUp = () => {
    console.log('Sign up clicked');
    router.push('/register'); // Navigálás a regisztrációs oldalra
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Parallax Background */}
      <ParallaxBackground />

      {/* Back to Home Button */}
      <div className="absolute top-6 left-6 z-20">
        <Link
          href="/"
          className="flex items-center space-x-2 text-muted-foreground hover:text-foreground transition-colors group"
        >
          <IconArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span className="group-hover:text-primary group-hover:underline transition-transform">
            Vissza a főoldalra
          </span>
        </Link>
      </div>

      {/* Login Form Container */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4 pt-8">
        <div className="w-full max-w-md">
          <LoginForm
            onSubmit={handleLogin}
            onForgotPassword={handleForgotPassword}
            onSignUp={handleSignUp}
          />
        </div>
      </div>
    </div>
  );
};

export default Login;
