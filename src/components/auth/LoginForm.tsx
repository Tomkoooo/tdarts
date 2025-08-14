
"use client";
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { IconEye, IconEyeOff, IconLogin, IconMail, IconLock, IconLanguage } from '@tabler/icons-react';
import Link from 'next/link';

// Nyelvi szövegek
const translations = {
  hu: {
    title: 'Bejelentkezés',
    subtitle: 'Lépj be a tDarts fiókodba',
    email: 'Email cím',
    emailPlaceholder: 'email@example.com',
    password: 'Jelszó',
    passwordPlaceholder: '••••••••',
    login: 'Bejelentkezés',
    loggingIn: 'Bejelentkezés...',
    forgotPassword: 'Elfelejtett jelszó?',
    noAccount: 'Még nincs fiókod?',
    registerHere: 'Regisztrálj itt',
    emailRequired: 'Email cím kötelező',
    validEmail: 'Érvényes email címet adj meg',
    passwordRequired: 'Jelszó kötelező',
    passwordMinLength: 'A jelszónak legalább 6 karakter hosszúnak kell lennie',
    showPassword: 'Jelszó megjelenítése',
    hidePassword: 'Jelszó elrejtése',
    language: 'Nyelv'
  },
  en: {
    title: 'Login',
    subtitle: 'Sign in to your tDarts account',
    email: 'Email address',
    emailPlaceholder: 'email@example.com',
    password: 'Password',
    passwordPlaceholder: '••••••••',
    login: 'Login',
    loggingIn: 'Logging in...',
    forgotPassword: 'Forgot password?',
    noAccount: "Don't have an account?",
    registerHere: 'Register here',
    emailRequired: 'Email is required',
    validEmail: 'Please enter a valid email address',
    passwordRequired: 'Password is required',
    passwordMinLength: 'Password must be at least 6 characters long',
    showPassword: 'Show password',
    hidePassword: 'Hide password',
    language: 'Language'
  }
};

type LoginFormData = {
  email: string;
  password: string;
};

interface LoginFormProps {
  onSubmit?: (data: LoginFormData) => Promise<void> | void;
  onForgotPassword?: () => void;
  onSignUp?: () => void;
  isLoading?: boolean;
  redirectPath?: string | null;
}

const LoginForm: React.FC<LoginFormProps> = ({
  onSubmit,
  onForgotPassword,
  onSignUp,
  isLoading = false,
  redirectPath,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [language, setLanguage] = useState<'hu' | 'en'>('hu');

  const t = translations[language];

  // Frissített validációs séma a nyelvnek megfelelően
  const loginSchema = z.object({
    email: z
      .string()
      .email(t.validEmail)
      .min(1, t.emailRequired),
    password: z
      .string()
      .min(6, t.passwordMinLength)
      .min(1, t.passwordRequired),
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onFormSubmit = async (data: LoginFormData) => {
    try {
      if (onSubmit) {
        await onSubmit(data);
      }
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  return (
    <div className="glass-card p-8 w-full max-w-md mx-auto">
      {/* Nyelv választó */}
      <div className="flex justify-end mb-4">
        <div className="dropdown dropdown-end">
          <div tabIndex={0} role="button" className="btn btn-sm btn-ghost">
            <IconLanguage className="w-4 h-4" />
            {t.language}
          </div>
          <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-32">
            <li><button onClick={() => setLanguage('hu')}>Magyar</button></li>
            <li><button onClick={() => setLanguage('en')}>English</button></li>
          </ul>
        </div>
      </div>

      <div className="text-center mb-8">
        <div className="flex items-center justify-center mb-4">
          <div className="p-3 rounded-full bg-gradient-to-r from-[hsl(var(--primary) / 0.2)] to-[hsl(var(--primary-dark) / 0.2)] border border-[hsl(var(--primary) / 0.3)]">
            <IconLogin className="w-8 h-8 text-[hsl(var(--primary))] text-glow" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-gradient-red mb-2">
          {t.title}
        </h1>
        <p className="text-[hsl(var(--muted-foreground))] text-sm">
          {t.subtitle}
        </p>
      </div>

      <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
        <div>
          <label className="label">
            <span className="label-text text-[hsl(var(--foreground))] font-medium">
              {t.email}
            </span>
          </label>
          <div className="relative">
            <IconMail  className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 z-10 text-[hsl(var(--muted-foreground))]" />
            <input
              {...register('email')}
              type="email"
              placeholder={t.emailPlaceholder}
              className="input input-bordered w-full pl-10 bg-[hsl(var(--background) / 0.5)] border-[hsl(var(--border) / 0.5)] focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary) / 0.2)] transition-all duration-200"
              disabled={isLoading}
            />
          </div>
          {errors.email && (
            <p className="text-error italic text-sm mt-1">
              {errors.email.message}
            </p>
          )}
        </div>

        <div>
          <label className="label">
            <span className="label-text text-[hsl(var(--foreground))] font-medium">
              {t.password}
            </span>
          </label>
          <div className="relative">
            <IconLock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 z-10 text-[hsl(var(--muted-foreground))]" />
            <input
              {...register('password')}
              type={showPassword ? 'text' : 'password'}
              placeholder={t.passwordPlaceholder}
              className="input input-bordered w-full pl-10 pr-10 bg-[hsl(var(--background) / 0.5)] border-[hsl(var(--border) / 0.5)] focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary) / 0.2)] transition-all duration-200"
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
              disabled={isLoading}
              title={showPassword ? t.hidePassword : t.showPassword}
            >
              {showPassword ? (
                <IconEyeOff className="w-5 h-5" />
              ) : (
                <IconEye className="w-5 h-5" />
              )}
            </button>
          </div>
          {errors.password && (
            <p className="text-error italic text-sm mt-1">
              {errors.password.message}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between">

          {onForgotPassword && (
            <Link
              href="/auth/forgot-password"
              className="text-sm text-[hsl(var(--primary))] hover:underline hover:text-[hsl(var(--primary-dark))] transition-colors"
            >
              {t.forgotPassword}
            </Link>
          )}
        </div>

        <button
          type="submit"
          className="btn btn-primary glass-button w-full"
          disabled={isLoading}
        >
          {isLoading ? (
            <div className="flex items-center space-x-2">
              <span className="loading loading-spinner w-4 h-4"></span>
              <span>{t.loggingIn}</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <IconLogin className="w-5 h-5" />
              <span>{t.login}</span>
            </div>
          )}
        </button>
      </form>

      {onSignUp && (
        <div className="mt-6 text-center">
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            {t.noAccount}{' '}
            <Link
              href={`/auth/register${redirectPath ? `?redirect=${redirectPath}` : ''}`}
              className="text-[hsl(var(--primary))] hover:underline hover:text-[hsl(var(--primary-dark))] transition-colors font-medium"
            >
              {t.registerHere}
            </Link>
          </p>
        </div>
      )}
    </div>
  );
};

export default LoginForm;