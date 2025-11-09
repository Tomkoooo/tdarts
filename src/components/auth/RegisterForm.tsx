"use client";
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, User, Mail, Lock, UserPlus, Languages, Chrome } from 'lucide-react';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/Form';

// Validációs séma az űrlaphoz, az API követelményeinek megfelelően
//eslint-disable-next-line @typescript-eslint/no-unused-vars
const registerSchema = z.object({
  email: z.string().email('Érvényes email címet adj meg').min(1, 'Email cím kötelező'),
  password: z
    .string()
    .min(6, 'A jelszónak legalább 6 karakter hosszúnak kell lennie')
    .min(1, 'Jelszó kötelező'),
  confirmPassword: z.string().min(1, 'Jelszó megerősítés kötelező'),
  name: z.string().min(1, 'Név kötelező'),
  username: z.string().regex(/^[^\s]+$/, 'A felhasználónév nem tartalmazhat szóközt'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "A jelszavak nem egyeznek",
  path: ["confirmPassword"],
});

type RegisterFormData = z.infer<typeof registerSchema>;

interface RegisterFormProps {
  onSubmit?: (data: RegisterFormData) => Promise<void> | void; // Regisztráció kezelésére
  onLogin?: () => void; // Bejelentkezés oldalra navigáláshoz
  isLoading?: boolean; // Betöltési állapot
  redirectPath?: string | null;
}

// Nyelvi szövegek
const translations = {
  hu: {
    title: 'Regisztráció',
    subtitle: 'Hozz létre egy tDarts fiókot',
    email: 'Email cím',
    emailPlaceholder: 'email@example.com',
    name: 'Név',
    namePlaceholder: 'Teljes név',
    username: 'Felhasználónév',
    usernamePlaceholder: 'felhasználónév',
    password: 'Jelszó',
    passwordPlaceholder: '••••••••',
    confirmPassword: 'Jelszó megerősítés',
    confirmPasswordPlaceholder: '••••••••',
    register: 'Regisztráció',
    registering: 'Regisztráció...',
    alreadyHaveAccount: 'Már van fiókod?',
    loginHere: 'Jelentkezz be itt',
    emailRequired: 'Email cím kötelező',
    validEmail: 'Érvényes email címet adj meg',
    nameRequired: 'Név kötelező',
    passwordRequired: 'Jelszó kötelező',
    passwordMinLength: 'A jelszónak legalább 6 karakter hosszúnak kell lennie',
    confirmPasswordRequired: 'Jelszó megerősítés kötelező',
    passwordsDontMatch: 'A jelszavak nem egyeznek',
    showPassword: 'Jelszó megjelenítése',
    hidePassword: 'Jelszó elrejtése',
    language: 'Nyelv',
    usernameNoSpaces: 'A felhasználónév nem tartalmazhat szóközt',
    registerWithGoogle: 'Regisztráció Google-lel',
    or: 'vagy'
  },
  en: {
    title: 'Registration',
    subtitle: 'Create a tDarts account',
    email: 'Email address',
    emailPlaceholder: 'email@example.com',
    name: 'Name',
    namePlaceholder: 'Full name',
    username: 'Username',
    usernamePlaceholder: 'username',
    password: 'Password',
    passwordPlaceholder: '••••••••',
    confirmPassword: 'Confirm password',
    confirmPasswordPlaceholder: '••••••••',
    register: 'Register',
    registering: 'Registering...',
    alreadyHaveAccount: 'Already have an account?',
    loginHere: 'Sign in here',
    emailRequired: 'Email is required',
    validEmail: 'Please enter a valid email address',
    nameRequired: 'Name is required',
    passwordRequired: 'Password is required',
    passwordMinLength: 'Password must be at least 6 characters long',
    confirmPasswordRequired: 'Password confirmation is required',
    passwordsDontMatch: 'Passwords do not match',
    showPassword: 'Show password',
    hidePassword: 'Hide password',
    language: 'Language',
    usernameNoSpaces: 'Username cannot contain spaces',
    registerWithGoogle: 'Sign up with Google',
    or: 'or'
  }
};

const RegisterForm: React.FC<RegisterFormProps> = ({
  onSubmit,
  onLogin,
  isLoading = false,
  redirectPath,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [language, setLanguage] = useState<'hu' | 'en'>('hu');

  const t = translations[language];

  // Frissített validációs séma a nyelvnek megfelelően
  const registerSchemaWithLanguage = z.object({
    email: z.string().email(t.validEmail).min(1, t.emailRequired),
    password: z
      .string()
      .min(6, t.passwordMinLength)
      .min(1, t.passwordRequired),
    confirmPassword: z.string().min(1, t.confirmPasswordRequired),
    name: z.string().min(1, t.nameRequired),
    username: z.string().regex(/^[^\s]+$/, t.usernameNoSpaces),
  }).refine((data) => data.password === data.confirmPassword, {
    message: t.passwordsDontMatch,
    path: ["confirmPassword"],
  });

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchemaWithLanguage),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
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

  const handleGoogleRegister = async () => {
    try {
      await signIn('google', { 
        callbackUrl: redirectPath || '/',
        redirect: true 
      });
    } catch (error) {
      console.error('Google registration error:', error);
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
            <UserPlus className="w-8 h-8 text-primary" />
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
          <form onSubmit={form.handleSubmit(onFormSubmit)} className="space-y-4">
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
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t.name}</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        placeholder={t.namePlaceholder}
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
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t.username}</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        placeholder={t.usernamePlaceholder}
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

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t.confirmPassword}</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder={t.confirmPasswordPlaceholder}
                        className="pl-10 pr-10"
                        disabled={isLoading}
                        {...field}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        disabled={isLoading}
                      >
                        {showConfirmPassword ? (
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

            <Button
              type="submit"
              className="w-full gap-2"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  <span>{t.registering}</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>{t.register}</span>
                </>
              )}
            </Button>
          </form>
        </Form>

        {/* Google regisztráció */}
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
            onClick={handleGoogleRegister}
            className="mt-4 w-full gap-2"
            disabled={isLoading}
          >
            <Chrome className="w-4 h-4" />
            {t.registerWithGoogle}
          </Button>
        </div>

        {/* Bejelentkezés link */}
        {onLogin && (
          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              {t.alreadyHaveAccount}{' '}
              <Link
                href={`/auth/login${redirectPath ? `?redirect=${encodeURIComponent(redirectPath)}` : ''}`}
                className="text-primary hover:underline hover:text-primary/80 transition-colors font-medium"
              >
                {t.loginHere}
              </Link>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RegisterForm;