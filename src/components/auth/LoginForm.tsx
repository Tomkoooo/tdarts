
"use client";
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, LogIn, Mail, Lock, Languages, Chrome } from 'lucide-react';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/Form';

// Nyelvi szövegek
const translations = {
  hu: {
    title: 'Bejelentkezés',
    subtitle: 'Lépj be a tDarts fiókodba',
    email: 'Email cím',
    emailPlaceholder: 'email@example.com',
    password: 'Jelszó',
    passwordPlaceholder: '••••••••',
    login: 'Bejelentkezés',
    loggingIn: 'Bejelentkezés...',
    forgotPassword: 'Elfelejtett jelszó?',
    noAccount: 'Még nincs fiókod?',
    registerHere: 'Regisztrálj itt',
    emailRequired: 'Email cím kötelező',
    validEmail: 'Érvényes email címet adj meg',
    passwordRequired: 'Jelszó kötelező',
    passwordMinLength: 'A jelszónak legalább 6 karakter hosszúnak kell lennie',
    showPassword: 'Jelszó megjelenítése',
    hidePassword: 'Jelszó elrejtése',
    language: 'Nyelv',
    loginWithGoogle: 'Bejelentkezés Google-lel',
    or: 'vagy'
  },
  en: {
    title: 'Login',
    subtitle: 'Sign in to your tDarts account',
    email: 'Email address',
    emailPlaceholder: 'email@example.com',
    password: 'Password',
    passwordPlaceholder: '••••••••',
    login: 'Login',
    loggingIn: 'Logging in...',
    forgotPassword: 'Forgot password?',
    noAccount: "Don't have an account?",
    registerHere: 'Register here',
    emailRequired: 'Email is required',
    validEmail: 'Please enter a valid email address',
    passwordRequired: 'Password is required',
    passwordMinLength: 'Password must be at least 6 characters long',
    showPassword: 'Show password',
    hidePassword: 'Hide password',
    language: 'Language',
    loginWithGoogle: 'Sign in with Google',
    or: 'or'
  }
};

type LoginFormData = {
  email: string;
  password: string;
};

interface LoginFormProps {
  onSubmit?: (data: LoginFormData) => Promise<void> | void;
  onForgotPassword?: () => void;
  onSignUp?: () => void;
  isLoading?: boolean;
  redirectPath?: string | null;
}

const LoginForm: React.FC<LoginFormProps> = ({
  onSubmit,
  onForgotPassword,
  onSignUp,
  isLoading = false,
  redirectPath,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [language, setLanguage] = useState<'hu' | 'en'>('hu');

  const t = translations[language];

  // Frissített validációs séma a nyelvnek megfelelően
  const loginSchema = z.object({
    email: z
      .string()
      .email(t.validEmail)
      .min(1, t.emailRequired),
    password: z
      .string()
      .min(6, t.passwordMinLength)
      .min(1, t.passwordRequired),
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
    } catch (error) {
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
      {/* Nyelv választó */}
      <div className="flex justify-end p-6 pb-0">
        <div className="dropdown dropdown-end">
          <div tabIndex={0} role="button" className="btn btn-sm btn-ghost">
            <Languages className="w-4 h-4" />
            {t.language}
          </div>
          <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-background rounded-box w-32">
            <li><button onClick={() => setLanguage('hu')}>Magyar</button></li>
            <li><button onClick={() => setLanguage('en')}>English</button></li>
          </ul>
        </div>
      </div>

      <CardHeader className="text-center pb-2">
        <div className="flex items-center justify-center mb-4">
          <div className="p-3 rounded-full bg-primary/10 border border-primary/20">
            <LogIn className="w-8 h-8 text-primary" />
          </div>
        </div>
        <CardTitle className="text-2xl text-primary">
          {t.title}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {t.subtitle}
        </p>
      </CardHeader>

      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onFormSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t.email}</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        placeholder={t.emailPlaceholder}
                        className="pl-10"
                        disabled={isLoading}
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t.password}</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder={t.passwordPlaceholder}
                        className="pl-10 pr-10"
                        disabled={isLoading}
                        {...field}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8"
                        onClick={() => setShowPassword(!showPassword)}
                        disabled={isLoading}
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex items-center justify-between">
              {onForgotPassword && (
                <Link
                  href="/auth/forgot-password"
                  className="text-sm text-primary hover:underline hover:text-primary/80 transition-colors"
                >
                  {t.forgotPassword}
                </Link>
              )}
            </div>

            <Button
              type="submit"
              className="w-full gap-2"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  <span>{t.loggingIn}</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>{t.login}</span>
                </>
              )}
            </Button>
          </form>
        </Form>

        {/* Google bejelentkezés */}
        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                {t.or}
              </span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={handleGoogleLogin}
            className="mt-4 w-full gap-2"
            disabled={isLoading}
          >
            <Chrome className="w-4 h-4" />
            {t.loginWithGoogle}
          </Button>
        </div>

        {onSignUp && (
          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              {t.noAccount}{' '}
              <Link
                href={`/auth/register${redirectPath ? `?redirect=${redirectPath}` : ''}`}
                className="text-primary hover:underline hover:text-primary/80 transition-colors font-medium"
              >
                {t.registerHere}
              </Link>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default LoginForm;