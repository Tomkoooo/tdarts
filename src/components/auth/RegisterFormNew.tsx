"use client";
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { IconEye, IconEyeOff, IconUserPlus, IconMail, IconLock, IconUser, IconBrandGoogle } from '@tabler/icons-react';
import { Link } from '@/i18n/routing';
import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/Card";
import { FormField } from '@/components/ui/form-field';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useTranslations } from 'next-intl';

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
  const t = useTranslations('Auth.register');
  const tv = useTranslations('Auth.validation');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(externalError || null);

  const registerSchema = z.object({
    username: z
      .string()
      .regex(/^[a-zA-Z0-9_]+$/, tv('username_invalid'))
      .regex(/^[^\s]+$/, tv('username_no_spaces'))
      .min(3, tv('username_min'))
      .min(1, tv('username_required')),
    name: z
      .string()
      .min(2, tv('name_min'))
      .min(1, tv('name_required')),
    email: z
      .string()
      .email(tv('email_invalid'))
      .min(1, tv('email_required')),
    password: z
      .string()
      .min(6, tv('password_min'))
      .min(1, tv('password_required')),
    confirmPassword: z
      .string()
      .min(1, tv('confirm_password_required')),
  }).refine((data) => data.password === data.confirmPassword, {
    message: tv('passwords_mismatch'),
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
      setError(error.message || t('error_generic'));
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
      setError(t('error_google'));
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center space-y-4">
        <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center border border-primary/20">
          <IconUserPlus className="w-8 h-8 text-primary" />
        </div>
        <div>
          <CardTitle className="text-3xl">{t('title')}</CardTitle>
          <CardDescription className="text-base mt-2">
            {t('subtitle')}
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
            label={t('username_label')}
            placeholder={t('username_placeholder')}
            error={errors.username?.message}
            icon={<IconUser className="w-5 h-5" />}
            disabled={isLoading}
            required
          />

          <FormField
            {...register('name')}
            type="text"
            label={t('name_label')}
            placeholder={t('name_placeholder')}
            error={errors.name?.message}
            icon={<IconUser className="w-5 h-5" />}
            disabled={isLoading}
            required
          />

          <FormField
            {...register('email')}
            type="email"
            label={t('email_label')}
            placeholder={t('email_placeholder')}
            error={errors.email?.message}
            icon={<IconMail className="w-5 h-5" />}
            disabled={isLoading}
            required
          />

          <div className="space-y-2">
            <FormField
              {...register('password')}
              type={showPassword ? 'text' : 'password'}
              label={t('password_label')}
              placeholder={t('password_placeholder')}
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
                  {t('hide_password')}
                </>
              ) : (
                <>
                  <IconEye className="w-4 h-4" />
                  {t('show_password')}
                </>
              )}
            </button>
          </div>

          <div className="space-y-2">
            <FormField
              {...register('confirmPassword')}
              type={showConfirmPassword ? 'text' : 'password'}
              label={t('confirm_password_label')}
              placeholder={t('password_placeholder')}
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
                  {t('hide_password')}
                </>
              ) : (
                <>
                  <IconEye className="w-4 h-4" />
                  {t('show_password')}
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
                {t('submitting')}
              </>
            ) : (
              <>
                <IconUserPlus className="w-5 h-5" />
                {t('submit')}
              </>
            )}
          </Button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <Separator />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">{t('separator')}</span>
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
          {t('google')}
        </Button>
      </CardContent>

      <CardFooter className="flex-col space-y-2">
        <Separator />
        <p className="text-sm text-center text-muted-foreground">
          {t('has_account')}{' '}
          <Link
            href={`/auth/login${redirectPath ? `?redirect=${redirectPath}` : ''}`}
            className="text-primary hover:underline font-medium transition-colors"
          >
            {t('login_link')}
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
};

export default RegisterFormNew;
