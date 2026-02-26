
"use client";
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { IconEye, IconEyeOff, IconLogin, IconMail, IconLock, IconLanguage, IconBrandGoogle } from '@tabler/icons-react';
import { Link } from '@/i18n/routing';
import { signIn } from 'next-auth/react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';

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
  const t = useTranslations('Auth');
  const locale = useLocale();
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);

  // Frissített validációs séma a nyelvnek megfelelően
  const loginSchema = z.object({
    email: z
      .string()
      .email(t('validation.email_invalid'))
      .min(1, t('validation.email_required')),
    password: z
      .string()
      .min(6, t('validation.password_min'))
      .min(1, t('validation.password_required')),
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

  const handleGoogleLogin = async () => {
    try {
      await signIn('google', { 
        callbackUrl: redirectPath || '/',
        redirect: true 
      });
    } catch (error) {
      console.error('Google login error:', error);
    }
  };

  const toggleLanguage = (newLocale: string) => {
    const currentPath = window.location.pathname;
    const newPath = currentPath.replace(`/${locale}`, `/${newLocale}`);
    router.push(newPath);
  };

  return (
    <div className="glass-card p-8 w-full max-w-md mx-auto">
      {/* Nyelv választó */}
      <div className="flex justify-end mb-4">
        <div className="dropdown dropdown-end">
          <div tabIndex={0} role="button" className="btn btn-sm btn-ghost">
            <IconLanguage className="w-4 h-4" />
            {t('login.language')}
          </div>
          <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-32">
            <li><button onClick={() => toggleLanguage('hu')}>{t("magyar_x1es")}</button></li>
            <li><button onClick={() => toggleLanguage('en')}>{t("english_1097")}</button></li>
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
          {t('login.title')}
        </h1>
        <p className="text-[hsl(var(--muted-foreground))] text-sm">
          {t('login.subtitle')}
        </p>
      </div>

      <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
        <div>
          <label className="label">
            <span className="label-text text-[hsl(var(--foreground))] font-medium">
              {t('login.email_label')}
            </span>
          </label>
          <div className="relative">
            <IconMail  className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 z-10 text-[hsl(var(--muted-foreground))]" />
            <input
              {...register('email')}
              type="email"
              placeholder={t('login.email_placeholder')}
              className="input input-bordered w-full pl-10 bg-[hsl(var(--background) / 0.5)] border-[hsl(var(--border) / 0.5)] focus:border-primary focus:ring-2 focus:ring-[hsl(var(--primary) / 0.2)] transition-all duration-200"
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
              {t('login.password_label')}
            </span>
          </label>
          <div className="relative">
            <IconLock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 z-10 text-[hsl(var(--muted-foreground))]" />
            <input
              {...register('password')}
              type={showPassword ? 'text' : 'password'}
              placeholder={t('login.password_placeholder')}
              className="input input-bordered w-full pl-10 pr-10 bg-[hsl(var(--background) / 0.5)] border-[hsl(var(--border) / 0.5)] focus:border-primary focus:ring-2 focus:ring-[hsl(var(--primary) / 0.2)] transition-all duration-200"
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
              disabled={isLoading}
              title={showPassword ? t('login.hide_password') : t('login.show_password')}
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
              {t('login.forgot_password')}
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
              <span>{t('login.submitting')}</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <IconLogin className="w-5 h-5" />
              <span>{t('login.submit')}</span>
            </div>
          )}
        </button>
      </form>

      {/* Google bejelentkezés */}
      <div className="mt-6">
      <div className="divider">
              {t('login.separator')}
          </div>

        <button
          type="button"
          onClick={handleGoogleLogin}
          className="mt-4 w-full cursor-pointer flex justify-center items-center px-4 py-2 border border-[hsl(var(--border) / 0.5)] rounded-lg shadow-sm bg-[hsl(var(--background) / 0.5)] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--background) / 0.8)] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary) / 0.2)] transition-all duration-200"
          disabled={isLoading}
        >
          <IconBrandGoogle className="w-5 h-5 mr-2" />
          {t('login.google')}
        </button>
      </div>

      {onSignUp && (
        <div className="mt-6 text-center">
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            {t('login.no_account')}{' '}
            <Link
              href={`/auth/register${redirectPath ? `?redirect=${redirectPath}` : ''}`}
              className="text-[hsl(var(--primary))] hover:underline hover:text-[hsl(var(--primary-dark))] transition-colors font-medium"
            >
              {t('login.register_link')}
            </Link>
          </p>
        </div>
      )}
    </div>
  );
};

export default LoginForm;