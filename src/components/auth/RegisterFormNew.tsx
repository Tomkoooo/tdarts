"use client";
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { IconEye, IconEyeOff, IconUserPlus, IconMail, IconLock, IconUser, IconBrandGoogle } from '@tabler/icons-react';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/Card";
import { FormField } from '@/components/ui/form-field';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';

type RegisterFormData = {
  username: string;
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
};

interface RegisterFormNewProps {
  onSubmit?: (data: RegisterFormData) => Promise<void> | void;
  isLoading?: boolean;
  redirectPath?: string | null;
  error?: string;
}

const registerSchema = z.object({
  username: z
    .string()
    .min(3, "A felhasználónévnek legalább 3 karakter hosszúnak kell lennie")
    .min(1, "Felhasználónév kötelező"),
  name: z
    .string()
    .min(2, "A névnek legalább 2 karakter hosszúnak kell lennie")
    .min(1, "Név kötelező"),
  email: z
    .string()
    .email("Érvényes email címet adj meg")
    .min(1, "Email cím kötelező"),
  password: z
    .string()
    .min(6, "A jelszónak legalább 6 karakter hosszúnak kell lennie")
    .min(1, "Jelszó kötelező"),
  confirmPassword: z
    .string()
    .min(1, "Jelszó megerősítés kötelező"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "A jelszavak nem egyeznek",
  path: ["confirmPassword"],
});

const RegisterFormNew: React.FC<RegisterFormNewProps> = ({
  onSubmit,
  isLoading = false,
  redirectPath,
  error: externalError,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(externalError || null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: '',
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onFormSubmit = async (data: RegisterFormData) => {
    try {
      setError(null);
      if (onSubmit) {
        await onSubmit(data);
      }
    } catch (error: any) {
      setError(error.message || 'Hiba történt a regisztráció során');
      console.error('Register error:', error);
    }
  };

  const handleGoogleSignup = async () => {
    try {
      await signIn('google', { 
        callbackUrl: redirectPath || '/',
        redirect: true 
      });
    } catch (error) {
      console.error('Google signup error:', error);
      setError('Hiba történt a Google regisztráció során');
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center space-y-4">
        <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center border border-primary/20">
          <IconUserPlus className="w-8 h-8 text-primary" />
        </div>
        <div>
          <CardTitle className="text-3xl">Regisztráció</CardTitle>
          <CardDescription className="text-base mt-2">
            Hozd létre a tDarts fiókod
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
          <FormField
            {...register('username')}
            type="text"
            label="Felhasználónév"
            placeholder="felhasznalo123"
            error={errors.username?.message}
            icon={<IconUser className="w-5 h-5" />}
            disabled={isLoading}
            required
          />

          <FormField
            {...register('name')}
            type="text"
            label="Teljes név"
            placeholder="Kovács János"
            error={errors.name?.message}
            icon={<IconUser className="w-5 h-5" />}
            disabled={isLoading}
            required
          />

          <FormField
            {...register('email')}
            type="email"
            label="Email cím"
            placeholder="email@example.com"
            error={errors.email?.message}
            icon={<IconMail className="w-5 h-5" />}
            disabled={isLoading}
            required
          />

          <div className="space-y-2">
            <FormField
              {...register('password')}
              type={showPassword ? 'text' : 'password'}
              label="Jelszó"
              placeholder="••••••••"
              error={errors.password?.message}
              icon={<IconLock className="w-5 h-5" />}
              disabled={isLoading}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
              disabled={isLoading}
            >
              {showPassword ? (
                <>
                  <IconEyeOff className="w-4 h-4" />
                  Jelszó elrejtése
                </>
              ) : (
                <>
                  <IconEye className="w-4 h-4" />
                  Jelszó megjelenítése
                </>
              )}
            </button>
          </div>

          <div className="space-y-2">
            <FormField
              {...register('confirmPassword')}
              type={showConfirmPassword ? 'text' : 'password'}
              label="Jelszó megerősítése"
              placeholder="••••••••"
              error={errors.confirmPassword?.message}
              icon={<IconLock className="w-5 h-5" />}
              disabled={isLoading}
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
              disabled={isLoading}
            >
              {showConfirmPassword ? (
                <>
                  <IconEyeOff className="w-4 h-4" />
                  Jelszó elrejtése
                </>
              ) : (
                <>
                  <IconEye className="w-4 h-4" />
                  Jelszó megjelenítése
                </>
              )}
            </button>
          </div>

          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                Regisztráció...
              </>
            ) : (
              <>
                <IconUserPlus className="w-5 h-5" />
                Regisztráció
              </>
            )}
          </Button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <Separator />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">vagy</span>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          className="w-full"
          size="lg"
          onClick={handleGoogleSignup}
          disabled={isLoading}
        >
          <IconBrandGoogle className="w-5 h-5" />
          Regisztráció Google-lel
        </Button>
      </CardContent>

      <CardFooter className="flex-col space-y-2">
        <Separator />
        <p className="text-sm text-center text-muted-foreground">
          Már van fiókod?{' '}
          <Link
            href={`/auth/login${redirectPath ? `?redirect=${redirectPath}` : ''}`}
            className="text-primary hover:underline font-medium transition-colors"
          >
            Jelentkezz be itt
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
};

export default RegisterFormNew;

