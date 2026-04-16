"use client"

import React, { useState } from "react"
import { IconUserPlus, IconBrandGoogle } from "@tabler/icons-react"
import Link from "next/link"
import { signIn } from "next-auth/react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/Button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/Card"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface RegisterFormNewProps {
  isLoading?: boolean
  redirectPath?: string | null
  error?: string
}

const RegisterFormNew: React.FC<RegisterFormNewProps> = ({
  isLoading = false,
  redirectPath,
  error: externalError,
}) => {
  const [error, setError] = useState<string | null>(externalError || null)

  const t = useTranslations("Auth.register")

  const handleGoogleSignup = async () => {
    try {
      setError(null)
      await signIn("google", {
        callbackUrl: redirectPath || "/",
        redirect: true,
      })
    } catch (err) {
      console.error("Google signup error:", err)
      setError(t("error_generic"))
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
            {t("subtitle_google_only")}
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {(error || externalError) && (
          <Alert variant="destructive">
            <AlertDescription>{error || externalError}</AlertDescription>
          </Alert>
        )}

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
      </CardContent>

      <CardFooter className="flex-col gap-2 text-sm text-muted-foreground">
        <Separator />
        <p className="text-center">
          {t("has_account")}{" "}
          <Link
            href={`/auth/login${redirectPath ? `?redirect=${encodeURIComponent(redirectPath)}` : ""}`}
            className="text-primary font-medium hover:text-primary/80 transition-colors underline-offset-4 hover:underline"
          >
            {t("login_link")}
          </Link>
        </p>
      </CardFooter>
    </Card>
  )
}

export default RegisterFormNew
