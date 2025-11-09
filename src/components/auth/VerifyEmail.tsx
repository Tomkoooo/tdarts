"use client";
import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { IconCheck } from '@tabler/icons-react';

// Validációs séma a verifikációs kódhoz
const verifyEmailSchema = z.object({
  code: z.string().min(1, 'Verifikációs kód kötelező'),
});

type VerifyEmailFormData = z.infer<typeof verifyEmailSchema>;

interface VerifyEmailProps {
  email: string; // Az email cím, amelyre a kódot küldték
  onSubmit?: (data: VerifyEmailFormData) => Promise<void> | void; // Kód beküldésének kezelése
  isLoading?: boolean; // Betöltési állapot
}

const VerifyEmail: React.FC<VerifyEmailProps> = ({ email, onSubmit, isLoading = false }) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<VerifyEmailFormData>({
    resolver: zodResolver(verifyEmailSchema),
    defaultValues: {
      code: '',
    },
  });

  const onFormSubmit = async (data: VerifyEmailFormData) => {
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
          <div className="p-3 rounded-full bg-gradient-to-r from-[hsl(var(--primary) / 0.2)] to-[hsl(var(--primary-dark) / 0.2)] border  / 0.3)]">
            <IconCheck className="w-8 h-8 text-[hsl(var(--primary))] text-glow" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-gradient-red mb-2">
          Email Verifikáció
        </h1>
        <p className="text-[hsl(var(--muted-foreground))] text-sm">
          Add meg a(z) {email} címre küldött verifikációs kódot
        </p>
      </div>

      <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
        {/* Verifikációs kód mező */}
        <div>
          <label className="label">
            <span className="label-text text-[hsl(var(--foreground))] font-medium">
              Verifikációs kód
            </span>
          </label>
          <input
            {...register('code')}
            type="text"
            placeholder="Kód"
            className="input input-bordered w-full bg-[hsl(var(--background) / 0.5)]  / 0.5)] focus: focus:ring-2 focus:ring-[hsl(var(--primary) / 0.2)] transition-all duration-200"
            disabled={isLoading}
          />
          {errors.code && (
            <p className="text-[hsl(var(--destructive))] text-sm mt-1">
              {errors.code.message}
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
              <span>Verifikálás...</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <IconCheck className="w-5 h-5" />
              <span>Verifikálás</span>
            </div>
          )}
        </button>
      </form>
    </div>
  );
};

export default VerifyEmail;