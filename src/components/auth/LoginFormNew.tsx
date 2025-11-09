"use client";
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { IconEye, IconEyeOff, IconLogin, IconMail, IconLock, IconBrandGoogle } from '@tabler/icons-react';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField } from '@/components/ui/form-field';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';

type LoginFormData = {
  email: string;
  password: string;
};

interface LoginFormNewProps {
  onSubmit?: (data: LoginFormData) => Promise<void> | void;
  isLoading?: boolean;
  redirectPath?: string | null;
  error?: string;
}

const loginSchema = z.object({
  email: z
    .string()
    .email("Érvényes email címet adj meg")
    .min(1, "Email cím kötelező"),
  password: z
    .string()
    .min(6, "A jelszónak legalább 6 karakter hosszúnak kell lennie")
    .min(1, "Jelszó kötelező"),
});

const LoginFormNew: React.FC<LoginFormNewProps> = ({
  onSubmit,
  isLoading = false,
  redirectPath,
  error: externalError,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(externalError || null);

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
      setError(null);
      if (onSubmit) {
        await onSubmit(data);
      }
    } catch (error: any) {
      setError(error.message || 'Hiba történt a bejelentkezés során');
      console.error('Login error:', error);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await signIn('google', { 
        callbackUrl: redirectPath || '/',
        redirect: true 
      });
    } catch (error) {
      console.error('Google login error:', error);
      setError('Hiba történt a Google bejelentkezés során');
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center space-y-4">
        <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center border border-primary/20">
          <IconLogin className="w-8 h-8 text-primary" />
        </div>
        <div>
          <CardTitle className="text-3xl">Bejelentkezés</CardTitle>
          <CardDescription className="text-base mt-2">
            Lépj be a tDarts fiókodba
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

          <div className="flex items-center justify-between">
            <Link
              href="/auth/forgot-password"
              className="text-sm text-primary hover:underline transition-colors"
            >
              Elfelejtett jelszó?
            </Link>
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
                Bejelentkezés...
              </>
            ) : (
              <>
                <IconLogin className="w-5 h-5" />
                Bejelentkezés
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
          onClick={handleGoogleLogin}
          disabled={isLoading}
        >
          <IconBrandGoogle className="w-5 h-5" />
          Bejelentkezés Google-lel
        </Button>
      </CardContent>

      <CardFooter className="flex-col space-y-2">
        <Separator />
        <p className="text-sm text-center text-muted-foreground">
          Még nincs fiókod?{' '}
          <Link
            href={`/auth/register${redirectPath ? `?redirect=${redirectPath}` : ''}`}
            className="text-primary hover:underline font-medium transition-colors"
          >
            Regisztrálj itt
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
};

export default LoginFormNew;

