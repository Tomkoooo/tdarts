"use client"

import React, { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  IconEye,
  IconEyeOff,
  IconUserPlus,
  IconMail,
  IconLock,
  IconUser,
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
import { Alert, AlertDescription } from "@/components/ui/alert"

type RegisterFormData = {
  username: string
  name: string
  email: string
  password: string
  confirmPassword: string
}

interface RegisterFormNewProps {
  onSubmit?: (data: RegisterFormData) => Promise<void> | void
  isLoading?: boolean
  redirectPath?: string | null
  error?: string
}

const RegisterFormNew: React.FC<RegisterFormNewProps> = ({
  onSubmit,
  isLoading = false,
  redirectPath,
  error: externalError,
}) => {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [showEmailRegister, setShowEmailRegister] = useState(false)
  const [error, setError] = useState<string | null>(externalError || null)

  const t = useTranslations("Auth.register")
  const tv = useTranslations("Auth.validation")

  const registerSchema = z.object({
    username: z
      .string()
      .min(1, tv("emailRequired"))
      .min(3, "Username must be at least 3 characters")
      .regex(/^[a-zA-Z0-9_]+$/, "Username may only contain letters, numbers and underscores"),
    name: z
      .string()
      .min(1, "Name is required")
      .min(2, "Name must be at least 2 characters"),
    email: z
      .string()
      .min(1, tv("emailRequired"))
      .email(tv("emailInvalid")),
    password: z
      .string()
      .min(1, tv("passwordRequired"))
      .min(8, tv("passwordMin")),
    confirmPassword: z
      .string()
      .min(1, tv("confirmPasswordRequired")),
  }).refine((data) => data.password === data.confirmPassword, {
    message: tv("passwordsMismatch"),
    path: ["confirmPassword"],
  })

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  })

  const onFormSubmit = async (data: RegisterFormData) => {
    try {
      setError(null)
      if (onSubmit) {
        await onSubmit(data)
      }
    } catch (err: any) {
      setError(err.message || t("errorGeneric"))
      console.error("Register error:", err)
    }
  }

  const handleGoogleSignup = async () => {
    try {
      await signIn("google", {
        callbackUrl: redirectPath || "/",
        redirect: true,
      })
    } catch (err) {
      console.error("Google signup error:", err)
      setError(t("errorGeneric"))
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center space-y-4">
        <div className="mx-auto w-16 h-16 rounded-full bg-primary/15 flex items-center justify-center border border-primary/20">
          <IconUserPlus className="w-8 h-8 text-primary" aria-hidden />
        </div>
        <div>
          <CardTitle className="text-3xl">{t("title")}</CardTitle>
          <CardDescription className="text-base mt-2">
            {t("subtitle")}
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Google signup */}
        <Button
          type="button"
          className="w-full"
          size="lg"
          onClick={handleGoogleSignup}
          disabled={isLoading}
        >
          <IconBrandGoogle className="w-5 h-5" aria-hidden />
          {t("google")}
        </Button>

        {/* Toggle email register */}
        <Button
          type="button"
          variant="outline"
          className="w-full"
          size="lg"
          onClick={() => setShowEmailRegister((prev) => !prev)}
          disabled={isLoading}
          aria-expanded={showEmailRegister}
        >
          <IconMail className="w-5 h-5" aria-hidden />
          {t("emailLabel")}
          {showEmailRegister ? (
            <IconChevronUp className="w-4 h-4 ml-auto" aria-hidden />
          ) : (
            <IconChevronDown className="w-4 h-4 ml-auto" aria-hidden />
          )}
        </Button>

        {showEmailRegister && (
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
                {...register("username")}
                type="text"
                label="Username"
                placeholder="your_username"
                error={errors.username?.message}
                icon={<IconUser className="w-5 h-5" aria-hidden />}
                disabled={isLoading}
                required
              />

              <FormField
                {...register("name")}
                type="text"
                label={`${t("firstNameLabel")} ${t("lastNameLabel")}`}
                placeholder="Full Name"
                error={errors.name?.message}
                icon={<IconUser className="w-5 h-5" aria-hidden />}
                disabled={isLoading}
                required
              />

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

              <div className="space-y-2">
                <FormField
                  {...register("confirmPassword")}
                  type={showConfirmPassword ? "text" : "password"}
                  label={t("confirmPasswordLabel")}
                  placeholder="••••••••"
                  error={errors.confirmPassword?.message}
                  icon={<IconLock className="w-5 h-5" aria-hidden />}
                  disabled={isLoading}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                  disabled={isLoading}
                >
                  {showConfirmPassword ? (
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
                  <span className="flex items-center gap-2">
                    <IconUserPlus className="w-5 h-5" aria-hidden />
                    {t("submit")}
                  </span>
                )}
              </Button>
            </form>
          </>
        )}
      </CardContent>

      <CardFooter className="flex-col gap-2 text-sm text-muted-foreground">
        <Separator />
        <p className="text-center">
          {t("hasAccount")}{" "}
          <Link
            href={`/auth/login${redirectPath ? `?redirect=${redirectPath}` : ""}`}
            className="text-primary font-medium hover:text-primary/80 transition-colors underline-offset-4 hover:underline"
          >
            {t("loginLink")}
          </Link>
        </p>
      </CardFooter>
    </Card>
  )
}

export default RegisterFormNew
