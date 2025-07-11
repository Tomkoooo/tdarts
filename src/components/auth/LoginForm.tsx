
"use client";
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { IconEye, IconEyeOff, IconLogin, IconMail, IconLock } from '@tabler/icons-react';
import Link from 'next/link';

const loginSchema = z.object({
  email: z
    .string()
    .email('Érvényes email címet adj meg')
    .min(1, 'Email cím kötelező'),
  password: z
    .string()
    .min(6, 'A jelszónak legalább 6 karakter hosszúnak kell lennie')
    .min(1, 'Jelszó kötelező'),
});

type LoginFormData = z.infer<typeof loginSchema>;

interface LoginFormProps {
  onSubmit?: (data: LoginFormData) => Promise<void> | void;
  onForgotPassword?: () => void;
  onSignUp?: () => void;
  isLoading?: boolean;
}

const LoginForm: React.FC<LoginFormProps> = ({
  onSubmit,
  onForgotPassword,
  onSignUp,
  isLoading = false,
}) => {
  const [showPassword, setShowPassword] = useState(false);

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
      <div className="text-center mb-8">
        <div className="flex items-center justify-center mb-4">
          <div className="p-3 rounded-full bg-gradient-to-r from-[hsl(var(--primary) / 0.2)] to-[hsl(var(--primary-dark) / 0.2)] border border-[hsl(var(--primary) / 0.3)]">
            <IconLogin className="w-8 h-8 text-[hsl(var(--primary))] text-glow" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-gradient-red mb-2">
          Bejelentkezés
        </h1>
        <p className="text-[hsl(var(--muted-foreground))] text-sm">
          Lépj be a tDarts fiókodba
        </p>
      </div>

      <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
        <div>
          <label className="label">
            <span className="label-text text-[hsl(var(--foreground))] font-medium">
              Email cím
            </span>
          </label>
          <div className="relative">
            <IconMail  className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 z-10 text-[hsl(var(--muted-foreground))]" />
            <input
              {...register('email')}
              type="email"
              placeholder="email@example.com"
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
              Jelszó
            </span>
          </label>
          <div className="relative">
            <IconLock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 z-10 text-[hsl(var(--muted-foreground))]" />
            <input
              {...register('password')}
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              className="input input-bordered w-full pl-10 pr-10 bg-[hsl(var(--background) / 0.5)] border-[hsl(var(--border) / 0.5)] focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary) / 0.2)] transition-all duration-200"
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
              disabled={isLoading}
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
          <label className="label cursor-pointer flex items-center space-x-2">
            <input
              type="checkbox"
              className="checkbox checkbox-primary"
              disabled={isLoading}
            />
            <span className="label-text text-sm text-[hsl(var(--muted-foreground))]">
              Emlékezz rám
            </span>
          </label>

          {onForgotPassword && (
            <Link
              href="/auth/forgot-password"
              className="text-sm text-[hsl(var(--primary))] hover:underline hover:text-[hsl(var(--primary-dark))] transition-colors"
            >
              Elfelejtett jelszó?
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
              <span>Bejelentkezés...</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <IconLogin className="w-5 h-5" />
              <span>Bejelentkezés</span>
            </div>
          )}
        </button>
      </form>

      {onSignUp && (
        <div className="mt-6 text-center">
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Még nincs fiókod?{' '}
            <Link
              href="/auth/register"
              className="text-[hsl(var(--primary))] hover:underline hover:text-[hsl(var(--primary-dark))] transition-colors font-medium"
            >
              Regisztrálj itt
            </Link>
          </p>
        </div>
      )}
    </div>
  );
};

export default LoginForm;