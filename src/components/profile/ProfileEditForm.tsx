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

const updateProfileSchema = z.object({
  email: z.string().email("Érvényes email címet adj meg").optional(),
  name: z.string().min(1, "Név kötelező").optional(),
  username: z.string().min(1, "Felhasználónév kötelező").optional(),
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
  message: "A jelszavak nem egyeznek vagy a jelszó túl rövid",
  path: ["confirmPassword"],
})

type UpdateProfileFormData = z.infer<typeof updateProfileSchema>

interface ProfileEditFormProps {
  defaultValues: {
    email?: string
    name?: string
    username?: string
  }
  isLoading: boolean
  onSubmit: (data: UpdateProfileFormData) => Promise<void>
}

export function ProfileEditForm({
  defaultValues,
  isLoading,
  onSubmit,
}: ProfileEditFormProps) {
  const [showPassword, setShowPassword] = React.useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UpdateProfileFormData>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues,
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <IconEdit className="w-5 h-5" />
          Profil szerkesztése
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <IconMail className="w-4 h-4" />
                Új email cím
              </Label>
              <Input
                id="email"
                {...register("email")}
                type="email"
                placeholder="email@example.com"
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
                Teljes név
              </Label>
              <Input
                id="name"
                {...register("name")}
                type="text"
                placeholder="Teljes név"
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
                Felhasználónév
              </Label>
              <Input
                id="username"
                {...register("username")}
                type="text"
                placeholder="Felhasználónév"
                disabled={isLoading}
              />
              {errors.username && (
                <p className="text-sm text-destructive">{errors.username.message}</p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password" className="flex items-center gap-2">
                <IconLock className="w-4 h-4" />
                Új jelszó (opcionális)
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  {...register("password")}
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
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
                Jelszó megerősítése
              </Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  {...register("confirmPassword")}
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="••••••••"
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
                Frissítés...
              </>
            ) : (
              <>
                <IconUser className="w-4 h-4 mr-2" />
                Profil frissítése
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

export default ProfileEditForm

