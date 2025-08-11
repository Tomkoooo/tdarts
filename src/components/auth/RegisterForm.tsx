"use client";
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { IconEye, IconEyeOff, IconUser, IconMail, IconLock, IconUserPlus } from '@tabler/icons-react';
import Link from 'next/link';

// Validációs séma az űrlaphoz, az API követelményeinek megfelelően
const registerSchema = z.object({
  email: z.string().email('Érvényes email címet adj meg').min(1, 'Email cím kötelező'),
  password: z
    .string()
    .min(6, 'A jelszónak legalább 6 karakter hosszúnak kell lennie')
    .min(1, 'Jelszó kötelező'),
  name: z.string().min(1, 'Név kötelező'),
  username: z.string(),
});

type RegisterFormData = z.infer<typeof registerSchema>;

interface RegisterFormProps {
  onSubmit?: (data: RegisterFormData) => Promise<void> | void; // Regisztráció kezelésére
  onLogin?: () => void; // Bejelentkezés oldalra navigáláshoz
  isLoading?: boolean; // Betöltési állapot
  redirectPath?: string | null;
}

const RegisterForm: React.FC<RegisterFormProps> = ({
  onSubmit,
  onLogin,
  isLoading = false,
  redirectPath,
}) => {
  const [showPassword, setShowPassword] = useState(false); // Jelszó láthatóság vezérlése

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: '',
      password: '',
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
      {/* Fejléc ikonnal és címmel */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center mb-4">
          <div className="p-3 rounded-full bg-gradient-to-r from-[hsl(var(--primary) / 0.2)] to-[hsl(var(--primary-dark) / 0.2)] border border-[hsl(var(--primary) / 0.3)]">
            <IconUserPlus className="w-8 h-8 text-[hsl(var(--primary))] text-glow" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-gradient-red mb-2">Regisztráció</h1>
        <p className="text-[hsl(var(--muted-foreground))] text-sm">
          Hozz létre egy tDarts fiókot
        </p>
      </div>

      <form onSubmit={handleSubmit(onFormSubmit)} className="gap-1 flex flex-col">
        {/* Email mező */}
        <div>
          <label className="label">
            <span className="label-text text-[hsl(var(--foreground))] font-medium">
              Email cím
            </span>
          </label>
          <div className="relative">
            <IconMail className="absolute left-3 z-10 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[hsl(var(--muted-foreground))]" />
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

        {/* Név mező */}
        <div>
          <label className="label">
            <span className="label-text text-[hsl(var(--foreground))] font-medium">
              Név
            </span>
          </label>
          <div className="relative">
            <IconUser className="absolute z-10 left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[hsl(var(--muted-foreground))]" />
            <input
              {...register('name')}
              type="text"
              placeholder="Teljes név"
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
              Felhasználónév
            </span>
          </label>
          <div className="relative">
            <IconUser className="absolute z-10 left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[hsl(var(--muted-foreground))]" />
            <input
              {...register('username')}
              type="text"
              placeholder="felhasználónév"
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
              Jelszó
            </span>
          </label>
          <div className="relative">
            <IconLock className="absolute left-3 z-10 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[hsl(var(--muted-foreground))]" />
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

        {/* Küldés gomb */}
        <button
          type="submit"
          className="btn btn-primary glass-button w-full"
          disabled={isLoading}
        >
          {isLoading ? (
            <div className="flex items-center space-x-2">
              <span className="loading loading-spinner w-4 h-4"></span>
              <span>Regisztráció...</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <IconUserPlus className="w-5 h-5" />
              <span>Regisztráció</span>
            </div>
          )}
        </button>
      </form>

      {/* Bejelentkezés link */}
      {onLogin && (
        <div className="mt-6 text-center">
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Már van fiókod?{' '}
            <Link
                href={`/auth/login${redirectPath ? `?redirect=${encodeURIComponent(redirectPath)}` : ''}`}
              className="text-[hsl(var(--primary))] hover:text-[hsl(var(--primary-dark))] transition-colors font-medium"
            >
              Jelentkezz be itt
            </Link>
          </p>
        </div>
      )}
    </div>
  );
};

export default RegisterForm;