"use client";
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { IconLock, IconKey, IconEye, IconEyeOff, IconMail, IconLanguage } from '@tabler/icons-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import axios from 'axios';

// Nyelvi szövegek
const translations = {
  hu: {
    title: 'Új jelszó megadása',
    subtitle: 'Add meg a kódot és az új jelszavadat',
    email: 'Email cím',
    emailPlaceholder: 'email@example.com',
    code: 'Visszaállítási kód',
    codePlaceholder: 'Kód',
    newPassword: 'Új jelszó',
    newPasswordPlaceholder: '••••••••',
    confirmPassword: 'Jelszó megerősítés',
    confirmPasswordPlaceholder: '••••••••',
    resetPassword: 'Jelszó visszaállítása',
    resetting: 'Jelszó visszaállítása...',
    backToLogin: 'Vissza a bejelentkezéshez?',
    login: 'Bejelentkezés',
    emailRequired: 'Email cím kötelező',
    validEmail: 'Érvényes email címet adj meg',
    codeRequired: 'Visszaállítási kód kötelező',
    passwordRequired: 'Jelszó kötelező',
    passwordMinLength: 'A jelszónak legalább 6 karakter hosszúnak kell lennie',
    confirmPasswordRequired: 'Jelszó megerősítés kötelező',
    passwordsDontMatch: 'A jelszavak nem egyeznek',
    showPassword: 'Jelszó megjelenítése',
    hidePassword: 'Jelszó elrejtése',
    language: 'Nyelv',
    loadingMessage: 'Jelszó visszaállítása folyamatban...',
    successMessage: 'Jelszó sikeresen visszaállítva!',
    errorMessage: 'Hiba történt a jelszó visszaállítása során'
  },
  en: {
    title: 'Set New Password',
    subtitle: 'Enter the code and your new password',
    email: 'Email address',
    emailPlaceholder: 'email@example.com',
    code: 'Reset code',
    codePlaceholder: 'Code',
    newPassword: 'New password',
    newPasswordPlaceholder: '••••••••',
    confirmPassword: 'Confirm password',
    confirmPasswordPlaceholder: '••••••••',
    resetPassword: 'Reset password',
    resetting: 'Resetting password...',
    backToLogin: 'Back to login?',
    login: 'Login',
    emailRequired: 'Email is required',
    validEmail: 'Please enter a valid email address',
    codeRequired: 'Reset code is required',
    passwordRequired: 'Password is required',
    passwordMinLength: 'Password must be at least 6 characters long',
    confirmPasswordRequired: 'Password confirmation is required',
    passwordsDontMatch: 'Passwords do not match',
    showPassword: 'Show password',
    hidePassword: 'Hide password',
    language: 'Language',
    loadingMessage: 'Resetting password...',
    successMessage: 'Password successfully reset!',
    errorMessage: 'An error occurred while resetting the password'
  }
};

type ResetPasswordFormData = {
  email: string;
  code: string;
  newPassword: string;
  confirmPassword: string;
};

interface ResetPasswordFormProps {
  isLoading?: boolean;
}

const ResetPasswordForm: React.FC<ResetPasswordFormProps> = ({ isLoading = false }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [language, setLanguage] = useState<'hu' | 'en'>('hu');
  const router = useRouter();

  const t = translations[language];

  // Frissített validációs séma a nyelvnek megfelelően
  const resetPasswordSchema = z.object({
    email: z.string().email(t.validEmail).min(1, t.emailRequired),
    code: z.string().min(1, t.codeRequired),
    newPassword: z.string().min(6, t.passwordMinLength).min(1, t.passwordRequired),
    confirmPassword: z.string().min(1, t.confirmPasswordRequired),
  }).refine((data) => data.newPassword === data.confirmPassword, {
    message: t.passwordsDontMatch,
    path: ["confirmPassword"],
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      email: '',
      code: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const onFormSubmit = async (data: ResetPasswordFormData) => {
    try {
      await toast.promise(
        axios.post('/api/auth/reset-password', data, {
          headers: { 'Content-Type': 'application/json' },
        }),
        {
          loading: t.loadingMessage,
          success: () => {
            router.push('/auth/login');
            return t.successMessage;
          },
          error: (error) => error.response?.data.error || t.errorMessage,
        }
      );
    } catch (error) {
      console.error('Reset password error:', error);
    }
  };

  return (
    <div className="form-container">
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
        <div className="form-icon-container">
          <IconKey className="form-icon" />
        </div>
        <h1 className="form-title">{t.title}</h1>
        <p className="form-subtitle">{t.subtitle}</p>
      </div>

      <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
        <div>
          <label className="form-label">
            <span className="form-label-text">{t.email}</span>
          </label>
          <div className="form-input-container">
            <IconMail className="form-input-icon" />
            <input
              {...register('email')}
              type="email"
              placeholder={t.emailPlaceholder}
              className="form-input"
              disabled={isLoading}
            />
          </div>
          {errors.email && <p className="form-error">{errors.email.message}</p>}
        </div>

        <div>
          <label className="form-label">
            <span className="form-label-text">{t.code}</span>
          </label>
          <div className="form-input-container">
            <IconKey className="form-input-icon" />
            <input
              {...register('code')}
              type="text"
              placeholder={t.codePlaceholder}
              className="form-input"
              disabled={isLoading}
            />
          </div>
          {errors.code && <p className="form-error">{errors.code.message}</p>}
        </div>

        <div>
          <label className="form-label">
            <span className="form-label-text">{t.newPassword}</span>
          </label>
          <div className="form-input-container">
            <IconLock className="form-input-icon" />
            <input
              {...register('newPassword')}
              type={showPassword ? 'text' : 'password'}
              placeholder={t.newPasswordPlaceholder}
              className="form-input pr-10"
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="form-password-toggle"
              disabled={isLoading}
              title={showPassword ? t.hidePassword : t.showPassword}
            >
              {showPassword ? <IconEyeOff className="w-5 h-5" /> : <IconEye className="w-5 h-5" />}
            </button>
          </div>
          {errors.newPassword && <p className="form-error">{errors.newPassword.message}</p>}
        </div>

        <div>
          <label className="form-label">
            <span className="form-label-text">{t.confirmPassword}</span>
          </label>
          <div className="form-input-container">
            <IconLock className="form-input-icon" />
            <input
              {...register('confirmPassword')}
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder={t.confirmPasswordPlaceholder}
              className="form-input pr-10"
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="form-password-toggle"
              disabled={isLoading}
              title={showConfirmPassword ? t.hidePassword : t.showPassword}
            >
              {showConfirmPassword ? <IconEyeOff className="w-5 h-5" /> : <IconEye className="w-5 h-5" />}
            </button>
          </div>
          {errors.confirmPassword && <p className="form-error">{errors.confirmPassword.message}</p>}
        </div>

        <button type="submit" className="form-button" disabled={isLoading}>
          {isLoading ? (
            <div className="form-button-loading">
              <span className="loading loading-spinner w-4 h-4"></span>
              <span>{t.resetting}</span>
            </div>
          ) : (
            <div className="form-button-loading">
              <IconKey className="form-button-icon" />
              <span>{t.resetPassword}</span>
            </div>
          )}
        </button>
      </form>

      <div className="form-link-container">
        <p className="form-link-text">
          {t.backToLogin}{' '}
          <Link href="/auth/login" className="form-link-highlight">
            {t.login}
          </Link>
        </p>
      </div>
    </div>
  );
};

export default ResetPasswordForm;