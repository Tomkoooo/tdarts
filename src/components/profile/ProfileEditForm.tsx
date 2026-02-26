"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { IconUser, IconMail, IconLock, IconEye, IconEyeOff, IconEdit } from "@tabler/icons-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Input } from "@/components/ui/Input"
import { Label } from "@/components/ui/Label"
import { Button } from "@/components/ui/Button"
import { useTranslations } from "next-intl"

const createUpdateProfileSchema = (t: any) => z.object({
  email: z.string().email(t("validation.email")).optional().or(z.literal('')),
  name: z.string().min(1, t("validation.name_required")).optional().or(z.literal('')),
  username: z.string().min(1, t("validation.username_required")).optional().or(z.literal('')),
  country: z.string().optional().or(z.literal('')),
  password: z.string().optional(),
  confirmPassword: z.string().optional(),
}).refine((data) => {
  // Only validate password if it's provided
  if (data.password && data.password.length > 0) {
    if (data.password.length < 6) {
      return false
    }
    if (!data.confirmPassword) {
      return false
    }
    if (data.password !== data.confirmPassword) {
      return false
    }
  }
  return true
}, {
  message: t("validation.password_mismatch"),
  path: ["confirmPassword"],
})

type UpdateProfileFormData = z.infer<ReturnType<typeof createUpdateProfileSchema>>

interface ProfileEditFormProps {
  defaultValues: {
    email?: string
    name?: string
    username?: string
    country?: string
  }
  isLoading: boolean
  onSubmit: (data: any) => Promise<void>
}

function ProfileEditForm({
  defaultValues,
  isLoading,
  onSubmit,
}: ProfileEditFormProps) {
  const t = useTranslations("Profile.edit")
  const tc = useTranslations("Profile.countries")
  const [showPassword, setShowPassword] = React.useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false)

  const schema = React.useMemo(() => createUpdateProfileSchema(t), [t])

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UpdateProfileFormData>({
    resolver: zodResolver(schema),
    defaultValues,
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <IconEdit className="w-5 h-5" />
          {t("title")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <IconMail className="w-4 h-4" />
                {t("email")}
              </Label>
              <Input
                id="email"
                {...register("email")}
                type="email"
                placeholder={t("placeholders.email")}
                disabled={isLoading}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name" className="flex items-center gap-2">
                <IconUser className="w-4 h-4" />
                {t("name")}
              </Label>
              <Input
                id="name"
                {...register("name")}
                type="text"
                placeholder={t("placeholders.name")}
                disabled={isLoading}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            {/* Username */}
            <div className="space-y-2">
              <Label htmlFor="username" className="flex items-center gap-2">
                <IconUser className="w-4 h-4" />
                {t("username")}
              </Label>
              <Input
                id="username"
                {...register("username")}
                type="text"
                placeholder={t("placeholders.username")}
                disabled={isLoading}
              />
              {errors.username && (
                <p className="text-sm text-destructive">{errors.username.message}</p>
              )}
            </div>

            {/* Country */}
            <div className="space-y-2">
              <Label htmlFor="country" className="flex items-center gap-2">
                <IconUser className="w-4 h-4" />
                {t("country")}
              </Label>
              <select
                id="country"
                {...register("country")}
                disabled={isLoading}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="hu">{tc("hu")}</option>
                <option value="at">{tc("at")}</option>
                <option value="de">{tc("de")}</option>
                <option value="sk">{tc("sk")}</option>
                <option value="ro">{tc("ro")}</option>
                <option value="hr">{tc("hr")}</option>
                <option value="si">{tc("si")}</option>
              </select>
              {errors.country && (
                <p className="text-sm text-destructive">{errors.country.message}</p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password" className="flex items-center gap-2">
                <IconLock className="w-4 h-4" />
                {t("password")}
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  {...register("password")}
                  type={showPassword ? "text" : "password"}
                  placeholder={t("placeholders.password")}
                  disabled={isLoading}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <IconEyeOff className="w-4 h-4" />
                  ) : (
                    <IconEye className="w-4 h-4" />
                  )}
                </Button>
              </div>
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="confirmPassword" className="flex items-center gap-2">
                <IconLock className="w-4 h-4" />
                {t("confirm_password")}
              </Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  {...register("confirmPassword")}
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder={t("placeholders.password")}
                  disabled={isLoading}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={isLoading}
                >
                  {showConfirmPassword ? (
                    <IconEyeOff className="w-4 h-4" />
                  ) : (
                    <IconEye className="w-4 h-4" />
                  )}
                </Button>
              </div>
              {errors.confirmPassword && (
                <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
              )}
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                {t("updating")}
              </>
            ) : (
              <>
                <IconUser className="w-4 h-4 mr-2" />
                {t("update_button")}
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

export default ProfileEditForm

