"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { IconLock, IconKey, IconEye, IconEyeOff, IconMail, IconLanguage, IconArrowLeft } from "@tabler/icons-react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import toast from "react-hot-toast"
import axios from "axios"

import { Button } from "@/components/ui/Button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card"
import { Input } from "@/components/ui/Input"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { resetPasswordSchema, ResetPasswordFormData } from "@/lib/validations"

// Translations
const translations = {
  hu: {
    title: 'Új jelszó megadása',
    subtitle: 'Add meg a kódot és az új jelszavadat',
    email: 'Email cím',
    emailPlaceholder: 'email@example.com',
    code: 'Visszaállítási kód',
    codePlaceholder: '6 karakteres kód',
    newPassword: 'Új jelszó',
    newPasswordPlaceholder: 'Minimum 8 karakter',
    confirmPassword: 'Jelszó megerősítés',
    confirmPasswordPlaceholder: 'Írd be újra a jelszót',
    resetPassword: 'Jelszó visszaállítása',
    resetting: 'Visszaállítás...',
    backToLogin: 'Vissza a bejelentkezéshez',
    showPassword: 'Jelszó megjelenítése',
    hidePassword: 'Jelszó elrejtése',
    language: 'Nyelv',
    loadingMessage: 'Jelszó visszaállítása folyamatban...',
    successMessage: 'Jelszó sikeresen visszaállítva!',
    errorMessage: 'Hiba történt a jelszó visszaállítása során'
  },
  en: {
    title: 'Set New Password',
    subtitle: 'Enter the code and your new password',
    email: 'Email address',
    emailPlaceholder: 'email@example.com',
    code: 'Reset code',
    codePlaceholder: '6 character code',
    newPassword: 'New password',
    newPasswordPlaceholder: 'Minimum 8 characters',
    confirmPassword: 'Confirm password',
    confirmPasswordPlaceholder: 'Re-enter password',
    resetPassword: 'Reset password',
    resetting: 'Resetting...',
    backToLogin: 'Back to login',
    showPassword: 'Show password',
    hidePassword: 'Hide password',
    language: 'Language',
    loadingMessage: 'Resetting password...',
    successMessage: 'Password successfully reset!',
    errorMessage: 'An error occurred while resetting the password'
  }
}

export function ResetPasswordFormNew() {
  const [showPassword, setShowPassword] = React.useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false)
  const [language, setLanguage] = React.useState<'hu' | 'en'>('hu')
  const [isLoading, setIsLoading] = React.useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const t = translations[language]

  const form = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      email: searchParams.get('email') || '',
      password: '',
      confirmPassword: '',
      token: '',
    },
  })

  const onSubmit = async (data: ResetPasswordFormData) => {
    setIsLoading(true)
    try {
      await toast.promise(
        axios.post('/api/auth/reset-password', {
          email: data.email,
          code: data.token,
          newPassword: data.password,
        }, {
          headers: { 'Content-Type': 'application/json' },
        }),
        {
          loading: t.loadingMessage,
          success: () => {
            setTimeout(() => router.push('/auth/login'), 1500)
            return t.successMessage
          },
          error: (error) => error.response?.data.error || t.errorMessage,
        }
      )
    } catch (error) {
      console.error('Reset password error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md border-primary/20 bg-card/50 backdrop-blur-sm">
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-between">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
            <IconKey className="w-6 h-6 text-primary" />
          </div>
          
          {/* Language Selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2">
                <IconLanguage className="w-4 h-4" />
                <span className="text-sm">{t.language}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setLanguage('hu')}>
                Magyar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLanguage('en')}>
                English
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <CardTitle className="text-2xl font-bold text-primary-foreground">
          {t.title}
        </CardTitle>
        <CardDescription className="text-base">
          {t.subtitle}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Email Field */}
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>{t.email}</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <IconMail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        type="email"
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

            {/* Code Field */}
            <FormField
              control={form.control}
              name="token"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>{t.code}</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <IconKey className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder={t.codePlaceholder}
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

            {/* New Password Field */}
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>{t.newPassword}</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <IconLock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder={t.newPasswordPlaceholder}
                        className="pl-10 pr-10"
                        disabled={isLoading}
                        {...field}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPassword ? (
                          <IconEyeOff className="w-4 h-4" />
                        ) : (
                          <IconEye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Confirm Password Field */}
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>{t.confirmPassword}</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <IconLock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder={t.confirmPasswordPlaceholder}
                        className="pl-10 pr-10"
                        disabled={isLoading}
                        {...field}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showConfirmPassword ? (
                          <IconEyeOff className="w-4 h-4" />
                        ) : (
                          <IconEye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full gap-2"
              disabled={isLoading}
              size="lg"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  <span>{t.resetting}</span>
                </>
              ) : (
                <>
                  <IconKey className="w-4 h-4" />
                  <span>{t.resetPassword}</span>
                </>
              )}
            </Button>

            {/* Back to Login Link */}
            <div className="text-center pt-2">
              <Link
                href="/auth/login"
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors group"
              >
                <IconArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                <span>{t.backToLogin}</span>
              </Link>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}

export default ResetPasswordFormNew

