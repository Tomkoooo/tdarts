"use client"

import React, { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  IconEye,
  IconEyeOff,
  IconLogin,
  IconMail,
  IconLock,
  IconBrandGoogle,
  IconChevronDown,
  IconChevronUp,
} from "@tabler/icons-react"
import Link from "next/link"
import { signIn } from "next-auth/react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/Button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/Card"
import { FormField } from "@/components/ui/form-field"
import { Separator } from "@/components/ui/separator"

type LoginFormData = {
  email: string
  password: string
}

interface LoginFormNewProps {
  onSubmit?: (data: LoginFormData) => Promise<void> | void
  isLoading?: boolean
  redirectPath?: string | null
  error?: string
}

const LoginFormNew: React.FC<LoginFormNewProps> = ({
  onSubmit,
  isLoading = false,
  redirectPath,
  error,
}) => {
  const [showPassword, setShowPassword] = useState(false)
  const [showEmailLogin, setShowEmailLogin] = useState(false)
  const t = useTranslations("Auth.login")
  const tv = useTranslations("Auth.validation")

  const loginSchema = z.object({
    email: z
      .string()
      .min(1, tv("emailRequired"))
      .email(tv("emailInvalid")),
    password: z
      .string()
      .min(1, tv("passwordRequired"))
      .min(8, tv("passwordMin")),
  })

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })

  const onFormSubmit = async (data: LoginFormData) => {
    try {
      if (onSubmit) {
        await onSubmit(data)
      }
    } catch (err: any) {
      console.error("Login error:", err)
    }
  }

  const handleGoogleLogin = async () => {
    try {
      await signIn("google", {
        callbackUrl: redirectPath || "/",
        redirect: true,
      })
    } catch (err) {
      console.error("Google login error:", err)
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center space-y-4">
        <div className="mx-auto w-16 h-16 rounded-full bg-primary/15 flex items-center justify-center border border-primary/20">
          <IconLogin className="w-8 h-8 text-primary" aria-hidden />
        </div>
        <div>
          <CardTitle className="text-3xl">{t("title")}</CardTitle>
          <CardDescription className="text-base mt-2">
            {t("subtitle")}
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Global error */}
        {error && (
          <div
            role="alert"
            className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            {error}
          </div>
        )}

        {/* Google login */}
        <Button
          type="button"
          className="w-full"
          size="lg"
          onClick={handleGoogleLogin}
          disabled={isLoading}
        >
          <IconBrandGoogle className="w-5 h-5" aria-hidden />
          {t("google")}
        </Button>

        {/* Toggle email login */}
        <Button
          type="button"
          variant="outline"
          className="w-full"
          size="lg"
          onClick={() => setShowEmailLogin((prev) => !prev)}
          disabled={isLoading}
          aria-expanded={showEmailLogin}
        >
          <IconMail className="w-5 h-5" aria-hidden />
          {showEmailLogin ? t("submit") : t("emailLabel")}
          {showEmailLogin ? (
            <IconChevronUp className="w-4 h-4 ml-auto" aria-hidden />
          ) : (
            <IconChevronDown className="w-4 h-4 ml-auto" aria-hidden />
          )}
        </Button>

        {showEmailLogin && (
          <>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">
                  {t("emailLabel")}
                </span>
              </div>
            </div>

            <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
              <FormField
                {...register("email")}
                type="email"
                label={t("emailLabel")}
                placeholder={t("emailPlaceholder")}
                error={errors.email?.message}
                icon={<IconMail className="w-5 h-5" aria-hidden />}
                disabled={isLoading}
                required
              />

              <div className="space-y-2">
                <FormField
                  {...register("password")}
                  type={showPassword ? "text" : "password"}
                  label={t("passwordLabel")}
                  placeholder="••••••••"
                  error={errors.password?.message}
                  icon={<IconLock className="w-5 h-5" aria-hidden />}
                  disabled={isLoading}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <>
                      <IconEyeOff className="w-4 h-4" aria-hidden />
                      {t("hidePassword")}
                    </>
                  ) : (
                    <>
                      <IconEye className="w-4 h-4" aria-hidden />
                      {t("showPassword")}
                    </>
                  )}
                </button>
              </div>

              <div className="flex justify-end">
                <Link
                  href="/auth/forgot-password"
                  className="text-sm text-primary hover:text-primary/80 transition-colors underline-offset-4 hover:underline"
                >
                  {t("forgotPassword")}
                </Link>
              </div>

              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-primary-foreground/40 border-t-primary-foreground rounded-full animate-spin" aria-hidden />
                    {t("submitting")}
                  </span>
                ) : (
                  t("submit")
                )}
              </Button>
            </form>
          </>
        )}
      </CardContent>

      <CardFooter className="flex-col gap-2 text-sm text-muted-foreground">
        <p>
          {t("noAccount")}{" "}
          <Link
            href={`/auth/register${redirectPath ? `?redirect=${redirectPath}` : ""}`}
            className="text-primary font-medium hover:text-primary/80 transition-colors underline-offset-4 hover:underline"
          >
            {t("registerLink")}
          </Link>
        </p>
      </CardFooter>
    </Card>
  )
}

export default LoginFormNew
