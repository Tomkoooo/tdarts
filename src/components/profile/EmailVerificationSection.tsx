"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { IconKey, IconRefresh, IconAlertCircle } from "@tabler/icons-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Input } from "@/components/ui/Input"
import { Label } from "@/components/ui/Label"
import { Button } from "@/components/ui/Button"
import { Alert, AlertDescription } from "@/components/ui/alert"

const verifyEmailSchema = z.object({
  code: z.string().min(1, "Verifikációs kód kötelező"),
})

type VerifyEmailFormData = z.infer<typeof verifyEmailSchema>

interface EmailVerificationSectionProps {
  isLoading: boolean
  isResending: boolean
  onVerifySubmit: (data: VerifyEmailFormData) => Promise<void>
  onResendCode: () => Promise<void>
}

export function EmailVerificationSection({
  isLoading,
  isResending,
  onVerifySubmit,
  onResendCode,
}: EmailVerificationSectionProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<VerifyEmailFormData>({
    resolver: zodResolver(verifyEmailSchema),
  })

  return (
    <Card className="border-warning/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <IconKey className="w-5 h-5" />
          Email ellenőrzés
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="bg-warning/10 border-warning/20">
          <IconAlertCircle className="w-4 h-4 text-warning" />
          <AlertDescription className="text-warning/90">
            Az email címed ellenőrzésre szorul. Kérlek add meg az emailben kapott ellenőrző kódot.
          </AlertDescription>
        </Alert>

        <form onSubmit={handleSubmit(onVerifySubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="verification-code" className="flex items-center gap-2">
              <IconKey className="w-4 h-4" />
              Ellenőrző kód
            </Label>
            <Input
              id="verification-code"
              {...register("code")}
              type="text"
              placeholder="Add meg az ellenőrző kódot"
              disabled={isLoading}
            />
            {errors.code && (
              <p className="text-sm text-destructive">{errors.code.message}</p>
            )}
          </div>

          <div className="flex gap-3">
            <Button type="submit" className="flex-1" disabled={isLoading}>
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                  Ellenőrzés...
                </>
              ) : (
                <>
                  <IconKey className="w-4 h-4 mr-2" />
                  Email ellenőrzése
                </>
              )}
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={onResendCode}
              disabled={isResending}
            >
              {isResending ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                  Küldés...
                </>
              ) : (
                <>
                  <IconRefresh className="w-4 h-4 mr-2" />
                  Újraküldés
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

export default EmailVerificationSection

