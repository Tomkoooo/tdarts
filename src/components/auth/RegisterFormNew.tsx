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
import { getAuthTranslations } from '@/data/translations/auth';

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

const RegisterFormNew: React.FC<RegisterFormNewProps> = ({
  onSubmit,
  isLoading = false,
  redirectPath,
  error: externalError,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showEmailRegister, setShowEmailRegister] = useState(false);
  const [error, setError] = useState<string | null>(externalError || null);
  const t = getAuthTranslations(typeof navigator !== 'undefined' ? navigator.language : 'hu');
  const registerSchema = z.object({
    username: z
      .string()
      .regex(/^[a-zA-Z0-9_]+$/, t.usernameFormatError)
      .regex(/^[^\s]+$/, t.usernameNoSpacesError)
      .min(3, t.usernameMinLengthError)
      .min(1, t.usernameRequiredError),
    name: z
      .string()
      .min(2, t.nameMinLengthError)
      .min(1, t.nameRequiredError),
    email: z
      .string()
      .email(t.validEmailError)
      .min(1, t.emailRequiredError),
    password: z
      .string()
      .min(6, t.passwordMinLengthError)
      .min(1, t.passwordRequiredError),
    confirmPassword: z
      .string()
      .min(1, t.confirmPasswordRequiredError),
  }).refine((data) => data.password === data.confirmPassword, {
    message: t.passwordsDoNotMatchError,
    path: ["confirmPassword"],
  });

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
      setError(error.message || t.registerGenericError);
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
      setError(t.registerGoogleError);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center space-y-4">
        <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center border border-primary/20">
          <IconUserPlus className="w-8 h-8 text-primary" />
        </div>
        <div>
          <CardTitle className="text-3xl">{t.registerTitle}</CardTitle>
          <CardDescription className="text-base mt-2">
            {t.registerSubtitle}
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Button
          type="button"
          className="w-full"
          size="lg"
          onClick={handleGoogleSignup}
          disabled={isLoading}
        >
          <IconBrandGoogle className="w-5 h-5" />
          {t.registerWithGoogle}
        </Button>

        <Button
          type="button"
          variant="outline"
          className="w-full"
          size="lg"
          onClick={() => setShowEmailRegister((prev) => !prev)}
          disabled={isLoading}
        >
          <IconMail className="w-5 h-5" />
          {showEmailRegister ? t.hideEmailRegister : t.registerWithEmail}
        </Button>

        {showEmailRegister && (
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
                {...register('username')}
                type="text"
                label={t.usernameLabel}
                placeholder={t.usernamePlaceholder}
                error={errors.username?.message}
                icon={<IconUser className="w-5 h-5" />}
                disabled={isLoading}
                required
              />

              <FormField
                {...register('name')}
                type="text"
                label={t.fullNameLabel}
                placeholder={t.fullNamePlaceholder}
                error={errors.name?.message}
                icon={<IconUser className="w-5 h-5" />}
                disabled={isLoading}
                required
              />

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

              <div className="space-y-2">
                <FormField
                  {...register('confirmPassword')}
                  type={showConfirmPassword ? 'text' : 'password'}
                  label={t.confirmPasswordLabel}
                  placeholder={t.passwordPlaceholder}
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

              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span>
                    {t.registering}
                  </>
                ) : (
                  <>
                    <IconUserPlus className="w-5 h-5" />
                    {t.registerButton}
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
          {t.alreadyHasAccount}{' '}
          <Link
            href={`/auth/login${redirectPath ? `?redirect=${redirectPath}` : ''}`}
            className="text-primary hover:underline font-medium transition-colors"
          >
            {t.loginHere}
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
};

export default RegisterFormNew;

