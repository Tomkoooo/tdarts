"use client"
import { useTranslations } from "next-intl";


import React, { useMemo } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import axios from "axios"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  IconBug,
  IconBulb,
  IconSettings,
  IconSparkles,
  IconDeviceDesktop,
  IconDeviceMobile,
  IconDeviceTablet,
  IconMessageCircle,
} from "@tabler/icons-react"
import { toast } from "react-hot-toast"

import { useUserContext } from "@/hooks/useUser"
import { showErrorToast } from "@/lib/toastUtils"
import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Textarea } from "@/components/ui/textarea"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"

const feedbackSchema = z.object({
  category: z.enum(["bug", "feature", "improvement", "other"], {
    required_error: "Válassz kategóriát",
  }),
  title: z.string().min(3, "Legalább 3 karakter").max(120, "Legfeljebb 120 karakter"),
  description: z.string().min(10, "Legalább 10 karakter").max(2000, "Legfeljebb 2000 karakter"),
  email: z.string().email("Adj meg érvényes email címet"),
  page: z.string().max(200).optional().or(z.literal("")),
  device: z.enum(["desktop", "mobile", "tablet"]),
})
type FeedbackValues = z.infer<typeof feedbackSchema>

export default function FeedbackPage() {
    const t = useTranslations("Feedback");
    const deviceOptions = useMemo(() => ([
      { value: "desktop", label: t("asztali_gep_46m4"), icon: IconDeviceDesktop },
      { value: "tablet", label: t("tablet_tq6v"), icon: IconDeviceTablet },
      { value: "mobile", label: t("mobil_18d4"), icon: IconDeviceMobile },
    ]), [t]);
    const categoryConfig = useMemo(() => ([
      { value: "bug", label: t("hiba_jelentese_pk3e"), icon: IconBug },
      { value: "feature", label: t("uj_funkcio_k5rt"), icon: IconBulb },
      { value: "improvement", label: t("fejlesztesi_javaslat_wiow"), icon: IconSettings },
      { value: "other", label: t("egyeb_13u7"), icon: IconSparkles },
    ]), [t]);
  const { user } = useUserContext()
  const router = useRouter()
  const searchParams = useSearchParams()

  const defaultValues = React.useMemo<FeedbackValues>(
    () => ({
      category: (searchParams.get("category") as FeedbackValues["category"]) || "bug",
      title: searchParams.get("title") || "",
      description: searchParams.get("description") || "",
      email: user?.email || "",
      page: searchParams.get("page") || "",
      device: (searchParams.get("device") as FeedbackValues["device"]) || "desktop",
    }),
    [searchParams, user?.email]
  )

  const form = useForm<FeedbackValues>({
    resolver: zodResolver(feedbackSchema),
    defaultValues,
  })

  React.useEffect(() => {
    form.reset(defaultValues)
  }, [defaultValues, form])

  React.useEffect(() => {
    if (!user) {
      router.push(`/auth/login?redirect=${encodeURIComponent("/feedback")}`)
      return
    }

    if (typeof window === "undefined") return

    const ua = navigator.userAgent
    const isMobile = /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)
    const isTablet = /iPad|Android(?=.*\bMobile\b)(?=.*\bSafari\b)/i.test(ua)

    const detectedDevice: FeedbackValues["device"] = isTablet ? "tablet" : isMobile ? "mobile" : "desktop"
    form.setValue("device", detectedDevice, { shouldDirty: false })

    if (!form.getValues("page")) {
      form.setValue("page", window.location.pathname, { shouldDirty: false })
    }
  }, [user, router, form])

  const onSubmit = async (values: FeedbackValues) => {
    try {
      await axios.post("/api/feedback", {
        ...values,
        userId: user?._id,
      })
      toast.success(t("köszönjük_a_visszajelzésedet"))
      form.reset({
        ...values,
        title: "",
        description: "",
        page: values.page,
      })
    } catch (error: any) {
      console.error("Error submitting feedback:", error)
      showErrorToast(error?.response?.data?.error || "Hiba történt a küldés során", {
        error: error?.response?.data?.error,
        context: "Feedback küldése",
        errorName: "Visszajelzés küldése sikertelen",
      })
    }
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen w-full py-12 px-4 md:px-6">
      <div className="mx-auto max-w-3xl space-y-8">
        {/* Header */}
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <IconMessageCircle className="text-primary" />
          </div>
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">{t("visszajelzés")}</h1>
            <p className="text-muted-foreground">{t("oszd_meg_velünk")}</p>
          </div>
        </div>

        {/* Form Card */}
        <Card className="bg-card/50 backdrop-blur-xl shadow-2xl shadow-black/20">
          <CardContent className="pt-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("kategória")}</FormLabel>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
                        {categoryConfig.map((category) => {
                          const Icon = category.icon
                          const isActive = field.value === category.value
                          return (
                            <button
                              type="button"
                              key={category.value}
                              onClick={() => field.onChange(category.value)}
                              className={cn(
                                "flex flex-col items-center gap-2 rounded-xl p-4 transition-all",
                                isActive
                                  ? "bg-primary/10 shadow-lg shadow-primary/20"
                                  : "bg-muted/20 hover:bg-muted/40"
                              )}
                            >
                              <Icon className="text-primary" />
                              <span className="text-xs font-medium text-center leading-tight">{category.label}</span>
                            </button>
                          )
                        })}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("cím")}</FormLabel>
                      <FormControl>
                        <Input placeholder={t("rövid_összefoglaló")} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("részletes_leírás")}</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder={t("írd_le_részletesen")}
                          className="min-h-[160px] resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("email_cím")}</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder={t("email_example_com")} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="device"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("eszköz")}</FormLabel>
                        <FormControl>
                          <select
                            {...field}
                            className="select select-bordered w-full h-11 rounded-xl bg-muted/20 border border-border/40 shadow-sm text-foreground font-medium focus:bg-muted/40 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                          >
                            <option value="" disabled>{t("válassz_eszközt")}</option>
                            {deviceOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="page"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("érintett_oldal_opcionális")}</FormLabel>
                      <FormControl>
                        <Input placeholder={t("tournaments_abc")} {...field} />
                      </FormControl>
                      <FormDescription>{t("az_oldal_ahol")}</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" size="lg" className="w-full" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? "Küldés..." : "Visszajelzés küldése"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
