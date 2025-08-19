"use client";
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { IconMail, IconSend, IconLanguage } from '@tabler/icons-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import axios from 'axios';

// Nyelvi szövegek
const translations = {
  hu: {
    title: 'Jelszó visszaállítás',
    subtitle: 'Add meg az email címedet a visszaállítási kódért',
    email: 'Email cím',
    emailPlaceholder: 'email@example.com',
    sendCode: 'Kód küldése',
    sending: 'Küldés...',
    backToLogin: 'Vissza a bejelentkezéshez?',
    login: 'Bejelentkezés',
    emailRequired: 'Email cím kötelező',
    validEmail: 'Érvényes email címet adj meg',
    language: 'Nyelv',
    loadingMessage: 'Email küldése folyamatban...',
    successMessage: 'Jelszó visszaállítási email elküldve!',
    errorMessage: 'Hiba történt az email küldése során'
  },
  en: {
    title: 'Password Reset',
    subtitle: 'Enter your email address for the reset code',
    email: 'Email address',
    emailPlaceholder: 'email@example.com',
    sendCode: 'Send code',
    sending: 'Sending...',
    backToLogin: 'Back to login?',
    login: 'Login',
    emailRequired: 'Email is required',
    validEmail: 'Please enter a valid email address',
    language: 'Language',
    loadingMessage: 'Sending email...',
    successMessage: 'Password reset email sent!',
    errorMessage: 'An error occurred while sending the email'
  }
};

type ForgotPasswordFormData = {
  email: string;
};

interface ForgotPasswordFormProps {
  isLoading?: boolean;
}

const ForgotPasswordForm: React.FC<ForgotPasswordFormProps> = ({ isLoading = false }) => {
  const [language, setLanguage] = useState<'hu' | 'en'>('hu');
  const router = useRouter();

  const t = translations[language];

  // Frissített validációs séma a nyelvnek megfelelően
  const forgotPasswordSchema = z.object({
    email: z.string().email(t.validEmail).min(1, t.emailRequired),
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  const onFormSubmit = async (data: ForgotPasswordFormData) => {
    try {
      await toast.promise(
        axios.post('/api/auth/forgot-password', data, {
          headers: { 'Content-Type': 'application/json' },
        }),
        {
          loading: t.loadingMessage,
          success: () => {
            // Email cím átadása URL paraméterként
            router.push(`/auth/reset-password?email=${encodeURIComponent(data.email)}`);
            return t.successMessage;
          },
          error: (error) => error.response?.data.error || t.errorMessage,
        }
      );
    } catch (error) {
      console.error('Forgot password error:', error);
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
          <IconSend className="form-icon" />
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

        <button type="submit" className="form-button" disabled={isLoading}>
          {isLoading ? (
            <div className="form-button-loading">
              <span className="loading loading-spinner w-4 h-4"></span>
              <span>{t.sending}</span>
            </div>
          ) : (
            <div className="form-button-loading">
              <IconSend className="form-button-icon" />
              <span>{t.sendCode}</span>
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

export default ForgotPasswordForm;