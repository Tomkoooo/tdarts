"use client";
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  IconEye, 
  IconEyeOff, 
  IconUserPlus, 
  IconMail, 
  IconLock, 
  IconUser, 
  IconLanguage,
  IconBrandGoogle,
  IconAt
} from '@tabler/icons-react';
import { Link } from '@/i18n/routing';
import { signIn } from 'next-auth/react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';

type RegisterFormData = {
  email: string;
  password: string;
  confirmPassword: string;
  name: string;
  username: string;
};

interface RegisterFormProps {
  onSubmit?: (data: any) => Promise<void> | void; 
  onLogin?: () => void;
  isLoading?: boolean;
  redirectPath?: string | null;
}

const RegisterForm: React.FC<RegisterFormProps> = ({
  onSubmit,
  onLogin,
  isLoading = false,
  redirectPath,
}) => {
  const t = useTranslations('Auth');
  const locale = useLocale();
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Frissített validációs séma a nyelvnek megfelelően
  const registerSchemaWithLanguage = z.object({
    email: z.string().email(t('validation.email_invalid')).min(1, t('validation.email_required')),
    password: z
      .string()
      .min(6, t('validation.password_min'))
      .min(1, t('validation.password_required')),
    confirmPassword: z.string().min(1, t('validation.confirm_password_required')),
    name: z.string().min(1, t('validation.name_required')),
    username: z.string().regex(/^[^\s]+$/, t('validation.username_no_spaces')),
  }).refine((data) => data.password === data.confirmPassword, {
    message: t('validation.passwords_mismatch'),
    path: ["confirmPassword"],
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchemaWithLanguage),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      name: '',
      username: '',
    },
  });

  const onFormSubmit = async (data: RegisterFormData) => {
    try {
      if (onSubmit) {
        await onSubmit(data);
      }
    } catch (error) {
      console.error('Registration error:', error);
    }
  };

  const handleGoogleRegister = async () => {
    try {
      await signIn('google', { 
        callbackUrl: redirectPath || '/',
        redirect: true 
      });
    } catch (error) {
      console.error('Google registration error:', error);
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
            {t('register.language')}
          </div>
          <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-32">
            <li><button onClick={() => toggleLanguage('hu')}>Magyar</button></li>
            <li><button onClick={() => toggleLanguage('en')}>English</button></li>
          </ul>
        </div>
      </div>

      {/* Fejléc ikonnal és címmel */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center mb-4">
          <div className="p-3 rounded-full bg-gradient-to-r from-[hsl(var(--primary) / 0.2)] to-[hsl(var(--primary-dark) / 0.2)] border border-[hsl(var(--primary) / 0.3)]">
            <IconUserPlus className="w-8 h-8 text-[hsl(var(--primary))] text-glow" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-gradient-red mb-2">{t('register.title')}</h1>
        <p className="text-[hsl(var(--muted-foreground))] text-sm">
          {t('register.subtitle')}
        </p>
      </div>

      <form onSubmit={handleSubmit(onFormSubmit)} className="gap-1 flex flex-col">
        {/* Email mező */}
        <div>
          <label className="label">
            <span className="label-text text-[hsl(var(--foreground))] font-medium">
              {t('register.email_label')}
            </span>
          </label>
          <div className="relative">
            <IconMail className="absolute left-3 z-10 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[hsl(var(--muted-foreground))]" />
            <input
              {...register('email')}
              type="email"
              placeholder={t('register.email_placeholder')}
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

        {/* Név mező */}
        <div>
          <label className="label">
            <span className="label-text text-[hsl(var(--foreground))] font-medium">
              {t('register.name_label')}
            </span>
          </label>
          <div className="relative">
            <IconUser className="absolute z-10 left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[hsl(var(--muted-foreground))]" />
            <input
              {...register('name')}
              type="text"
              placeholder={t('register.name_placeholder')}
              className="input input-bordered w-full pl-10 bg-[hsl(var(--background) / 0.5)] border-[hsl(var(--border) / 0.5)] focus:border-primary focus:ring-2 focus:ring-[hsl(var(--primary) / 0.2)] transition-all duration-200"
              disabled={isLoading}
            />
          </div>
          {errors.name && (
            <p className="text-error italic text-sm mt-1">
              {errors.name.message}
            </p>
          )}
        </div>

        {/* Felhasználónév mező (opcionális) */}
        <div>
          <label className="label">
            <span className="label-text text-[hsl(var(--foreground))] font-medium">
              {t('register.username_label')}
            </span>
          </label>
          <div className="relative">
            <IconAt className="absolute z-10 left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[hsl(var(--muted-foreground))]" />
            <input
              {...register('username')}
              type="text"
              placeholder={t('register.username_placeholder')}
              className="input input-bordered w-full pl-10 bg-[hsl(var(--background) / 0.5)] border-[hsl(var(--border) / 0.5)] focus:border-primary focus:ring-2 focus:ring-[hsl(var(--primary) / 0.2)] transition-all duration-200"
              disabled={isLoading}
            />
          </div>
          {errors.username && (
            <p className="text-error italic text-sm mt-1">
              {errors.username.message}
            </p>
          )}
        </div>

        {/* Jelszó mező */}
        <div className="mb-2 flex flex-col">
          <label className="label">
            <span className="label-text text-[hsl(var(--foreground))] font-medium">
              {t('register.password_label')}
            </span>
          </label>
          <div className="relative">
            <IconLock className="absolute left-3 z-10 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[hsl(var(--muted-foreground))]" />
            <input
              {...register('password')}
              type={showPassword ? 'text' : 'password'}
              placeholder={t('register.password_placeholder')}
              className="input input-bordered w-full pl-10 pr-10 bg-[hsl(var(--background) / 0.5)] border-[hsl(var(--border) / 0.5)] focus:border-primary focus:ring-2 focus:ring-[hsl(var(--primary) / 0.2)] transition-all duration-200"
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
              disabled={isLoading}
              title={showPassword ? t('register.hide_password') : t('register.show_password')}
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

        {/* Jelszó megerősítés mező */}
        <div className="mb-2 flex flex-col">
          <label className="label">
            <span className="label-text text-[hsl(var(--foreground))] font-medium">
              {t('register.confirm_password_label')}
            </span>
          </label>
          <div className="relative">
            <IconLock className="absolute left-3 z-10 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[hsl(var(--muted-foreground))]" />
            <input
              {...register('confirmPassword')}
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder={t('register.password_placeholder')}
              className="input input-bordered w-full pl-10 pr-10 bg-[hsl(var(--background) / 0.5)] border-[hsl(var(--border) / 0.5)] focus:border-primary focus:ring-2 focus:ring-[hsl(var(--primary) / 0.2)] transition-all duration-200"
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
              disabled={isLoading}
              title={showConfirmPassword ? t('register.hide_password') : t('register.show_password')}
            >
              {showConfirmPassword ? (
                <IconEyeOff className="w-5 h-5" />
              ) : (
                <IconEye className="w-5 h-5" />
              )}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="text-error italic text-sm mt-1">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        {/* Küldés gomb */}
        <button
          type="submit"
          className="btn btn-primary glass-button w-full"
          disabled={isLoading}
        >
          {isLoading ? (
            <div className="flex items-center space-x-2">
              <span className="loading loading-spinner w-4 h-4"></span>
              <span>{t('register.registering')}</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <IconUserPlus className="w-5 h-5" />
              <span>{t('register.submit')}</span>
            </div>
          )}
        </button>
      </form>

      {/* Google regisztráció */}
      <div className="mt-6">

      <div className="divider">
              {t('register.separator')}
          </div>

        <button
          type="button"
          onClick={handleGoogleRegister}
          className="mt-4 w-full flex justify-center cursor-pointer items-center px-4 py-2 border border-[hsl(var(--border) / 0.5)] rounded-lg shadow-sm bg-[hsl(var(--background) / 0.5)] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--background) / 0.8)] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary) / 0.2)] transition-all duration-200"
          disabled={isLoading}
        >
          <IconBrandGoogle className="w-5 h-5 mr-2" />
          {t('register.google')}
        </button>
      </div>

      {/* Bejelentkezés link */}
      {onLogin && (
        <div className="mt-6 text-center">
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            {t('register.has_account')}{' '}
            <Link
                href={`/auth/login${redirectPath ? `?redirect=${encodeURIComponent(redirectPath)}` : ''}`}
              className="text-[hsl(var(--primary))] hover:text-[hsl(var(--primary-dark))] transition-colors font-medium"
            >
              {t('register.login_link')}
            </Link>
          </p>
        </div>
      )}
    </div>
  );
};

export default RegisterForm;