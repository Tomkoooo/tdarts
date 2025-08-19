"use client";
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { IconEye, IconEyeOff, IconUser, IconMail, IconLock, IconUserPlus, IconLanguage } from '@tabler/icons-react';
import Link from 'next/link';

// Validációs séma az űrlaphoz, az API követelményeinek megfelelően
//eslint-disable-next-line @typescript-eslint/no-unused-vars
const registerSchema = z.object({
  email: z.string().email('Érvényes email címet adj meg').min(1, 'Email cím kötelező'),
  password: z
    .string()
    .min(6, 'A jelszónak legalább 6 karakter hosszúnak kell lennie')
    .min(1, 'Jelszó kötelező'),
  confirmPassword: z.string().min(1, 'Jelszó megerősítés kötelező'),
  name: z.string().min(1, 'Név kötelező'),
  username: z.string().regex(/^[^\s]+$/, 'A felhasználónév nem tartalmazhat szóközt'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "A jelszavak nem egyeznek",
  path: ["confirmPassword"],
});

type RegisterFormData = z.infer<typeof registerSchema>;

interface RegisterFormProps {
  onSubmit?: (data: RegisterFormData) => Promise<void> | void; // Regisztráció kezelésére
  onLogin?: () => void; // Bejelentkezés oldalra navigáláshoz
  isLoading?: boolean; // Betöltési állapot
  redirectPath?: string | null;
}

// Nyelvi szövegek
const translations = {
  hu: {
    title: 'Regisztráció',
    subtitle: 'Hozz létre egy tDarts fiókot',
    email: 'Email cím',
    emailPlaceholder: 'email@example.com',
    name: 'Név',
    namePlaceholder: 'Teljes név',
    username: 'Felhasználónév',
    usernamePlaceholder: 'felhasználónév',
    password: 'Jelszó',
    passwordPlaceholder: '••••••••',
    confirmPassword: 'Jelszó megerősítés',
    confirmPasswordPlaceholder: '••••••••',
    register: 'Regisztráció',
    registering: 'Regisztráció...',
    alreadyHaveAccount: 'Már van fiókod?',
    loginHere: 'Jelentkezz be itt',
    emailRequired: 'Email cím kötelező',
    validEmail: 'Érvényes email címet adj meg',
    nameRequired: 'Név kötelező',
    passwordRequired: 'Jelszó kötelező',
    passwordMinLength: 'A jelszónak legalább 6 karakter hosszúnak kell lennie',
    confirmPasswordRequired: 'Jelszó megerősítés kötelező',
    passwordsDontMatch: 'A jelszavak nem egyeznek',
    showPassword: 'Jelszó megjelenítése',
    hidePassword: 'Jelszó elrejtése',
    language: 'Nyelv',
    usernameNoSpaces: 'A felhasználónév nem tartalmazhat szóközt'
  },
  en: {
    title: 'Registration',
    subtitle: 'Create a tDarts account',
    email: 'Email address',
    emailPlaceholder: 'email@example.com',
    name: 'Name',
    namePlaceholder: 'Full name',
    username: 'Username',
    usernamePlaceholder: 'username',
    password: 'Password',
    passwordPlaceholder: '••••••••',
    confirmPassword: 'Confirm password',
    confirmPasswordPlaceholder: '••••••••',
    register: 'Register',
    registering: 'Registering...',
    alreadyHaveAccount: 'Already have an account?',
    loginHere: 'Sign in here',
    emailRequired: 'Email is required',
    validEmail: 'Please enter a valid email address',
    nameRequired: 'Name is required',
    passwordRequired: 'Password is required',
    passwordMinLength: 'Password must be at least 6 characters long',
    confirmPasswordRequired: 'Password confirmation is required',
    passwordsDontMatch: 'Passwords do not match',
    showPassword: 'Show password',
    hidePassword: 'Hide password',
    language: 'Language',
    usernameNoSpaces: 'Username cannot contain spaces'
  }
};

const RegisterForm: React.FC<RegisterFormProps> = ({
  onSubmit,
  onLogin,
  isLoading = false,
  redirectPath,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [language, setLanguage] = useState<'hu' | 'en'>('hu');

  const t = translations[language];

  // Frissített validációs séma a nyelvnek megfelelően
  const registerSchemaWithLanguage = z.object({
    email: z.string().email(t.validEmail).min(1, t.emailRequired),
    password: z
      .string()
      .min(6, t.passwordMinLength)
      .min(1, t.passwordRequired),
    confirmPassword: z.string().min(1, t.confirmPasswordRequired),
    name: z.string().min(1, t.nameRequired),
    username: z.string().regex(/^[^\s]+$/, t.usernameNoSpaces),
  }).refine((data) => data.password === data.confirmPassword, {
    message: t.passwordsDontMatch,
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

      {/* Fejléc ikonnal és címmel */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center mb-4">
          <div className="p-3 rounded-full bg-gradient-to-r from-[hsl(var(--primary) / 0.2)] to-[hsl(var(--primary-dark) / 0.2)] border border-[hsl(var(--primary) / 0.3)]">
            <IconUserPlus className="w-8 h-8 text-[hsl(var(--primary))] text-glow" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-gradient-red mb-2">{t.title}</h1>
        <p className="text-[hsl(var(--muted-foreground))] text-sm">
          {t.subtitle}
        </p>
      </div>

      <form onSubmit={handleSubmit(onFormSubmit)} className="gap-1 flex flex-col">
        {/* Email mező */}
        <div>
          <label className="label">
            <span className="label-text text-[hsl(var(--foreground))] font-medium">
              {t.email}
            </span>
          </label>
          <div className="relative">
            <IconMail className="absolute left-3 z-10 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[hsl(var(--muted-foreground))]" />
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

        {/* Név mező */}
        <div>
          <label className="label">
            <span className="label-text text-[hsl(var(--foreground))] font-medium">
              {t.name}
            </span>
          </label>
          <div className="relative">
            <IconUser className="absolute z-10 left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[hsl(var(--muted-foreground))]" />
            <input
              {...register('name')}
              type="text"
              placeholder={t.namePlaceholder}
              className="input input-bordered w-full pl-10 bg-[hsl(var(--background) / 0.5)] border-[hsl(var(--border) / 0.5)] focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary) / 0.2)] transition-all duration-200"
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
              {t.username}
            </span>
          </label>
          <div className="relative">
            <IconUser className="absolute z-10 left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[hsl(var(--muted-foreground))]" />
            <input
              {...register('username')}
              type="text"
              placeholder={t.usernamePlaceholder}
              className="input input-bordered w-full pl-10 bg-[hsl(var(--background) / 0.5)] border-[hsl(var(--border) / 0.5)] focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary) / 0.2)] transition-all duration-200"
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
              {t.password}
            </span>
          </label>
          <div className="relative">
            <IconLock className="absolute left-3 z-10 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[hsl(var(--muted-foreground))]" />
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

        {/* Jelszó megerősítés mező */}
        <div className="mb-2 flex flex-col">
          <label className="label">
            <span className="label-text text-[hsl(var(--foreground))] font-medium">
              {t.confirmPassword}
            </span>
          </label>
          <div className="relative">
            <IconLock className="absolute left-3 z-10 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[hsl(var(--muted-foreground))]" />
            <input
              {...register('confirmPassword')}
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder={t.confirmPasswordPlaceholder}
              className="input input-bordered w-full pl-10 pr-10 bg-[hsl(var(--background) / 0.5)] border-[hsl(var(--border) / 0.5)] focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary) / 0.2)] transition-all duration-200"
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
              disabled={isLoading}
              title={showConfirmPassword ? t.hidePassword : t.showPassword}
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
              <span>{t.registering}</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <IconUserPlus className="w-5 h-5" />
              <span>{t.register}</span>
            </div>
          )}
        </button>
      </form>

      {/* Bejelentkezés link */}
      {onLogin && (
        <div className="mt-6 text-center">
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            {t.alreadyHaveAccount}{' '}
            <Link
                href={`/auth/login${redirectPath ? `?redirect=${encodeURIComponent(redirectPath)}` : ''}`}
              className="text-[hsl(var(--primary))] hover:text-[hsl(var(--primary-dark))] transition-colors font-medium"
            >
              {t.loginHere}
            </Link>
          </p>
        </div>
      )}
    </div>
  );
};

export default RegisterForm;