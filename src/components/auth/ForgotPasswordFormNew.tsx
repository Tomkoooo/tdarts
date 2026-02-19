"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { IconMail, IconSend, IconLanguage, IconArrowLeft } from "@tabler/icons-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
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
import { forgotPasswordSchema, ForgotPasswordFormData } from "@/lib/validations"
import { useTranslations } from "next-intl"

export function ForgotPasswordFormNew() {
  const t = useTranslations('Auth.forgot_password')
  const [isLoading, setIsLoading] = React.useState(false)
  const router = useRouter()

  const form = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  })

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true)
    try {
      await toast.promise(
        axios.post('/api/auth/forgot-password', data, {
          headers: { 'Content-Type': 'application/json' },
        }),
        {
          loading: t('loading'),
          success: () => {
            router.push(`/auth/reset-password?email=${encodeURIComponent(data.email)}`)
            return t('success')
          },
          error: (error) => error.response?.data.error || t('error_generic'),
        }
      )
    } catch (error) {
      console.error('Forgot password error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md border-primary/20 bg-card/50 backdrop-blur-sm">
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-between">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
            <IconSend className="w-6 h-6 text-primary" />
          </div>
        </div>

        <CardTitle className="text-2xl font-bold text-primary-foreground">
          {t('title')}
        </CardTitle>
        <CardDescription className="text-base">
          {t('subtitle')}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Email Field */}
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>{t('email_label')}</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <IconMail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        type="email"
                        placeholder={t('email_placeholder')}
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
                  <span>{t('submitting')}</span>
                </>
              ) : (
                <>
                  <IconSend className="w-4 h-4" />
                  <span>{t('submit')}</span>
                </>
              )}
            </Button>

            {/* Back to Login Link */}
            <div className="text-center">
              <Link
                href="/auth/login"
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors group"
              >
                <IconArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                <span>{t('back_to_login')}</span>
              </Link>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}

export default ForgotPasswordFormNew

