"use client";
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { IconLock, IconKey, IconEye, IconEyeOff, IconMail } from '@tabler/icons-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import axios from 'axios';

const resetPasswordSchema = z.object({
  email: z.string().email('Érvényes email címet adj meg').min(1, 'Email cím kötelező'),
  code: z.string().min(1, 'Visszaállítási kód kötelező'),
  newPassword: z.string().min(6, 'A jelszónak legalább 6 karakter hosszúnak kell lennie'),
});

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

interface ResetPasswordFormProps {
  isLoading?: boolean;
}

const ResetPasswordForm: React.FC<ResetPasswordFormProps> = ({ isLoading = false }) => {
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
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
    },
  });

  const onFormSubmit = async (data: ResetPasswordFormData) => {
    try {
      await toast.promise(
        axios.post('/api/auth/reset-password', data, {
          headers: { 'Content-Type': 'application/json' },
        }),
        {
          loading: 'Jelszó visszaállítása folyamatban...',
          success: () => {
            router.push('/auth/login');
            return 'Jelszó sikeresen visszaállítva!';
          },
          error: (error) => error.response?.data.error || 'Hiba történt a jelszó visszaállítása során',
        }
      );
    } catch (error) {
      console.error('Reset password error:', error);
    }
  };

  return (
    <div className="form-container">
      <div className="text-center mb-8">
        <div className="form-icon-container">
          <IconKey className="form-icon" />
        </div>
        <h1 className="form-title">Új jelszó megadása</h1>
        <p className="form-subtitle">Add meg a kódot és az új jelszavadat</p>
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

        <div>
          <label className="form-label">
            <span className="form-label-text">Visszaállítási kód</span>
          </label>
          <div className="form-input-container">
            <IconKey className="form-input-icon" />
            <input
              {...register('code')}
              type="text"
              placeholder="Kód"
              className="form-input"
              disabled={isLoading}
            />
          </div>
          {errors.code && <p className="form-error">{errors.code.message}</p>}
        </div>

        <div>
          <label className="form-label">
            <span className="form-label-text">Új jelszó</span>
          </label>
          <div className="form-input-container">
            <IconLock className="form-input-icon" />
            <input
              {...register('newPassword')}
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              className="form-input pr-10"
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="form-password-toggle"
              disabled={isLoading}
            >
              {showPassword ? <IconEyeOff className="w-5 h-5" /> : <IconEye className="w-5 h-5" />}
            </button>
          </div>
          {errors.newPassword && <p className="form-error">{errors.newPassword.message}</p>}
        </div>

        <button type="submit" className="form-button" disabled={isLoading}>
          {isLoading ? (
            <div className="form-button-loading">
              <span className="loading loading-spinner w-4 h-4"></span>
              <span>Jelszó visszaállítása...</span>
            </div>
          ) : (
            <div className="form-button-loading">
              <IconKey className="form-button-icon" />
              <span>Jelszó visszaállítása</span>
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

export default ResetPasswordForm;