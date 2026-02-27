"use client";
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { IconEye, IconEyeOff, IconLogin, IconMail, IconLock, IconBrandGoogle } from '@tabler/icons-react';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/Card";
import { FormField } from '@/components/ui/form-field';
import { Separator } from '@/components/ui/separator';
import { getAuthTranslations } from '@/data/translations/auth';


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

const LoginFormNew: React.FC<LoginFormNewProps> = ({
  onSubmit,
  isLoading = false,
  redirectPath,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showEmailLogin, setShowEmailLogin] = useState(false);
  const t = getAuthTranslations(typeof navigator !== 'undefined' ? navigator.language : 'hu');
  const loginSchema = z.object({
    email: z
      .string()
      .email(t.validEmailError)
      .min(1, t.emailRequiredError),
    password: z
      .string()
      .min(6, t.passwordMinLengthError)
      .min(1, t.passwordRequiredError),
  });

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
    } catch (error: any) {
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
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center space-y-4">
        <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center border border-primary/20">
          <IconLogin className="w-8 h-8 text-primary" />
        </div>
        <div>
          <CardTitle className="text-3xl">{t.loginTitle}</CardTitle>
          <CardDescription className="text-base mt-2">
            {t.loginSubtitle}
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <Button
          type="button"
          className="w-full"
          size="lg"
          onClick={handleGoogleLogin}
          disabled={isLoading}
        >
          <IconBrandGoogle className="w-5 h-5" />
          {t.loginWithGoogle}
        </Button>

        <Button
          type="button"
          variant="outline"
          className="w-full"
          size="lg"
          onClick={() => setShowEmailLogin((prev) => !prev)}
          disabled={isLoading}
        >
          <IconMail className="w-5 h-5" />
          {showEmailLogin ? t.hideEmailLogin : t.loginWithEmail}
        </Button>

        {showEmailLogin && (
          <>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">{t.emailAndPassword}</span>
              </div>
            </div>

            <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
              <FormField
                {...register('email')}
                type="email"
                label={t.emailLabel}
                placeholder={t.emailPlaceholder}
                error={errors.email?.message}
                icon={<IconMail className="w-5 h-5" />}
                disabled={isLoading}
                required
              />

              <div className="space-y-2">
                <FormField
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  label={t.passwordLabel}
                  placeholder={t.passwordPlaceholder}
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
                      {t.hidePassword}
                    </>
                  ) : (
                    <>
                      <IconEye className="w-4 h-4" />
                      {t.showPassword}
                    </>
                  )}
                </button>
              </div>

              <div className="flex items-center justify-between">
                <Link
                  href="/auth/forgot-password"
                  className="text-sm text-primary hover:underline transition-colors"
                >
                  {t.forgotPassword}
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
                    {t.loggingIn}
                  </>
                ) : (
                  <>
                    <IconLogin className="w-5 h-5" />
                    {t.loginButton}
                  </>
                )}
              </Button>
            </form>
          </>
        )}
      </CardContent>

      <CardFooter className="flex-col space-y-2">
        <Separator />
        <p className="text-sm text-center text-muted-foreground">
          {t.noAccount}{' '}
          <Link
            href={`/auth/register${redirectPath ? `?redirect=${redirectPath}` : ''}`}
            className="text-primary hover:underline font-medium transition-colors"
          >
            {t.registerHere}
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
};

export default LoginFormNew;

