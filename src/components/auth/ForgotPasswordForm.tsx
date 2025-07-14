"use client";
import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { IconMail, IconSend } from '@tabler/icons-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import axios from 'axios';

const forgotPasswordSchema = z.object({
  email: z.string().email('Érvényes email címet adj meg').min(1, 'Email cím kötelező'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

interface ForgotPasswordFormProps {
  isLoading?: boolean;
}

const ForgotPasswordForm: React.FC<ForgotPasswordFormProps> = ({ isLoading = false }) => {
  const router = useRouter();
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
          loading: 'Email küldése folyamatban...',
          success: () => {
            router.push('/auth/reset-password');
            return 'Jelszó visszaállítási email elküldve!';
          },
          error: (error) => error.response?.data.error || 'Hiba történt az email küldése során',
        }
      );
    } catch (error) {
      console.error('Forgot password error:', error);
    }
  };

  return (
    <div className="form-container">
      <div className="text-center mb-8">
        <div className="form-icon-container">
          <IconSend className="form-icon" />
        </div>
        <h1 className="form-title">Jelszó visszaállítás</h1>
        <p className="form-subtitle">Add meg az email címedet a visszaállítási kódért</p>
      </div>

      <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
        <div>
          <label className="form-label">
            <span className="form-label-text">Email cím</span>
          </label>
          <div className="form-input-container">
            <IconMail className="form-input-icon" />
            <input
              {...register('email')}
              type="email"
              placeholder="email@example.com"
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
              <span>Küldés...</span>
            </div>
          ) : (
            <div className="form-button-loading">
              <IconSend className="form-button-icon" />
              <span>Kód küldése</span>
            </div>
          )}
        </button>
      </form>

      <div className="form-link-container">
        <p className="form-link-text">
          Vissza a bejelentkezéshez?{' '}
          <Link href="/auth/login" className="form-link-highlight">
            Bejelentkezés
          </Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPasswordForm;