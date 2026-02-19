"use client";
import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { IconCheck } from '@tabler/icons-react';
import { useTranslations } from 'next-intl';

interface VerifyEmailProps {
  email: string; // Az email cím, amelyre a kódot küldték
  onSubmit?: (data: { code: string }) => Promise<void> | void; // Kód beküldésének kezelése
  isLoading?: boolean; // Betöltési állapot
}

const VerifyEmail: React.FC<VerifyEmailProps> = ({ email, onSubmit, isLoading = false }) => {
  const t = useTranslations('Auth.verify');
  const tv = useTranslations('Auth.validation');

  const verifyEmailSchema = z.object({
    code: z.string().min(1, tv('code_required')),
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<{ code: string }>({
    resolver: zodResolver(verifyEmailSchema),
    defaultValues: {
      code: '',
    },
  });

  const onFormSubmit = async (data: { code: string }) => {
    try {
      if (onSubmit) {
        await onSubmit(data);
      }
    } catch (error) {
      console.error('Verification error:', error);
    }
  };

  return (
    <div className="glass-card p-8 w-full max-w-md mx-auto">
      {/* Fejléc ikonnal és címmel */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center mb-4">
          <div className="p-3 rounded-full bg-gradient-to-r from-primary/20 to-primary/5 border border-primary/20">
            <IconCheck className="w-8 h-8 text-primary" />
          </div>
        </div>
        <h1 className="text-2xl font-bold mb-2">
          {t('title')}
        </h1>
        <p className="text-muted-foreground text-sm">
          {t('subtitle', { email })}
        </p>
      </div>

      <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
        {/* Verifikációs kód mező */}
        <div>
          <label className="block text-sm font-medium mb-2">
            {t('code_label')}
          </label>
          <input
            {...register('code')}
            type="text"
            placeholder={t('code_placeholder')}
            className="w-full px-4 py-2 rounded-lg bg-background border border-border focus:ring-2 focus:ring-primary/20 outline-none transition-all"
            disabled={isLoading}
          />
          {errors.code && (
            <p className="text-destructive text-sm mt-1">
              {errors.code.message}
            </p>
          )}
        </div>

        {/* Küldés gomb */}
        <button
          type="submit"
          className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground h-10 px-4 py-2 rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <span className="animate-spin">⏳</span>
              <span>{t('submitting')}</span>
            </>
          ) : (
            <>
              <IconCheck className="w-5 h-5" />
              <span>{t('submit')}</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default VerifyEmail;