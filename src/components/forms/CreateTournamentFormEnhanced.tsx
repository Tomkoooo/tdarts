"use client"
import { useTranslations } from "next-intl";


import * as React from "react"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { 
  IconTrophy, IconCalendar, IconUsers, IconTarget, 
  IconLock, IconWorld, IconPlus, IconTrash, IconInfoCircle,
} from '@tabler/icons-react';

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/Input"
import { Button } from "@/components/ui/Button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card"
import { cn } from "@/lib/utils"
import { createTournamentSchema, CreateTournamentFormData } from "@/lib/validations"

interface CreateTournamentFormEnhancedProps {
  onSubmit: (data: CreateTournamentFormData) => Promise<void>
  onCancel?: () => void
  defaultValues?: Partial<CreateTournamentFormData>
}

export function CreateTournamentFormEnhanced({
  onSubmit,
  onCancel,
  defaultValues,
}: CreateTournamentFormEnhancedProps) {
    const t = useTranslations("Common");
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [submitSuccess, setSubmitSuccess] = React.useState(false)

  const form = useForm<CreateTournamentFormData>({
    resolver: zodResolver(createTournamentSchema) as any,
    defaultValues: {
      name: "",
      description: "",
      city: "",
      address: "",
      maxPlayers: 16,
      format: "single-elimination",
      gameType: "501",
      legsToWin: 3,
      isPublic: true,
      boards: [{ number: 1 }],
      ...defaultValues,
    },
  })

  const handleSubmit = async (data: CreateTournamentFormData) => {
    try {
      setIsSubmitting(true)
      setSubmitSuccess(false)
      
      // Convert empty strings to 0 for number fields
      const cleanedData = {
        ...data,
        maxPlayers: typeof data.maxPlayers === 'string' && data.maxPlayers === '' ? 0 : data.maxPlayers,
        legsToWin: typeof data.legsToWin === 'string' && data.legsToWin === '' ? 0 : data.legsToWin,
        location: `${data.city}, ${data.address}`, // Combine city and address
        boards: data.boards?.map((board: any) => ({
          ...board,
          number: typeof board.number === 'string' && board.number === '' ? 0 : board.number,
        })) || [],
      };
      
      await onSubmit(cleanedData as CreateTournamentFormData)
      setSubmitSuccess(true)
      form.reset()
    } catch (error) {
      console.error("Form submission error:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const { fields: boards, append, remove } = useFieldArray({
    control: form.control,
    name: "boards",
  })

  const isPublic = form.watch("isPublic")

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <IconTrophy className="w-5 h-5 text-primary" />
              {t("alapvető_információk")}</CardTitle>
            <CardDescription>
              {t("add_meg_a_91")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Tournament Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>{t("verseny_neve")}</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder={t("pl_tavaszi_darts")}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    {t("válassz_egy_egyedi")}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("leírás")}</FormLabel>
                  <FormControl>
                    <textarea
                      className={cn(
                        "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
                        "ring-offset-background placeholder:text-muted-foreground",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                        "disabled:cursor-not-allowed disabled:opacity-50"
                      )}
                      placeholder={t("rövid_leírás_a")}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    {t("opcionális_rövid_leírás")}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Start Date */}
            <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>{t("kezdési_dátum")}</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type="datetime-local"
                        {...field}
                        value={field.value ? new Date(field.value).toISOString().slice(0, 16) : ""}
                        onChange={(e) => field.onChange(new Date(e.target.value))}
                      />
                      <IconCalendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    </div>
                  </FormControl>
                  <FormDescription>
                    {t("mikor_kezdődik_a")}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Tournament Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <IconTarget className="w-5 h-5 text-primary" />
              {t("verseny_beállítások")}</CardTitle>
            <CardDescription>
              {t("válaszd_ki_a_78")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Max Players */}
            <FormField
              control={form.control}
              name="maxPlayers"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>{t("maximum_játékosszám")}</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type="number"
                        min={0}
                        max={128}
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value === '' ? '' : parseInt(e.target.value))}
                      />
                      <IconUsers className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    </div>
                  </FormControl>
                  <FormDescription>
                    {t("hány_játékos_vehet")}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Format */}
            <FormField
              control={form.control}
              name="format"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>{t("verseny_formátum")}</FormLabel>
                  <FormControl>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { value: "single-elimination", label: t("egyenes_kieses_lfsy"), description: "Egy vereség = kiesés" },
                        { value: "double-elimination", label: t("dupla_kieses_g6zf"), description: "Két vereség = kiesés" },
                        { value: "round-robin", label: t("kormerkozes_vrpm"), description: "Mindenki mindenkivel" },
                        { value: "group_knockout", label: t("csoportos_cksc"), description: "Csoportok + kiesés" },
                      ].map((format) => (
                        <button
                          key={format.value}
                          type="button"
                          onClick={() => field.onChange(format.value)}
                          className={cn(
                            "p-4 rounded-lg border-2 text-left transition-all",
                            field.value === format.value
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/50"
                          )}
                        >
                          <div className="font-semibold mb-1">{format.label}</div>
                          <div className="text-xs text-muted-foreground">{format.description}</div>
                        </button>
                      ))}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Game Type */}
            <FormField
              control={form.control}
              name="gameType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>{t("játék_típus")}</FormLabel>
                  <FormControl>
                    <div className="flex gap-3">
                      {["501", "301", "cricket"].map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => field.onChange(type)}
                          className={cn(
                            "flex-1 px-6 py-3 rounded-lg border-2 font-semibold transition-all",
                            field.value === type
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border hover:border-primary/50"
                          )}
                        >
                          {type.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Legs to Win */}
            <FormField
              control={form.control}
              name="legsToWin"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>{t("nyeréshez_szükséges_leg")}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      max={11}
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(e.target.value === '' ? '' : parseInt(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>
                    {t("hány_leg_et")}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Boards */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <IconTarget className="w-5 h-5 text-primary" />
              {t("táblák")}</CardTitle>
            <CardDescription>
              {t("add_meg_a_88")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {boards.map((board, index) => (
              <div key={board.id} className="flex items-center gap-3">
                <FormField
                  control={form.control}
                  name={`boards.${index}.number`}
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          placeholder={t("tábla_szám")}
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.value === '' ? '' : parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {boards.length > 1 && (
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    onClick={() => remove(index)}
                  >
                    <IconTrash className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              className="w-full gap-2"
              onClick={() => append({ number: boards.length + 1 })}
            >
              <IconPlus className="w-4 h-4" />
              {t("tábla_hozzáadása")}</Button>
          </CardContent>
        </Card>

        {/* Privacy Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {isPublic ? <IconWorld className="w-5 h-5 text-primary" /> : <IconLock className="w-5 h-5 text-primary" />}
              {t("láthatóság")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Is Public */}
            <FormField
              control={form.control}
              name="isPublic"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <FormLabel>{t("nyilvános_verseny")}</FormLabel>
                      <FormDescription>
                        {t("a_verseny_látható")}</FormDescription>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={field.value}
                      onClick={() => field.onChange(!field.value)}
                      className={cn(
                        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                        field.value ? "bg-primary" : "bg-muted"
                      )}
                    >
                      <span
                        className={cn(
                          "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                          field.value ? "translate-x-6" : "translate-x-1"
                        )}
                      />
                    </button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Password (if private) */}
            {!isPublic && (
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("jelszó")}</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder={t("verseny_jelszava")}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      <div className="flex items-center gap-2">
                        <IconInfoCircle className="w-4 h-4" />
                        <span>{t("a_játékosoknak_ezt")}</span>
                      </div>
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </CardContent>
        </Card>

        {/* Submit Success Message */}
        {submitSuccess && (
          <div className="text-sm font-medium text-success">
            {t("verseny_sikeresen_létrehozva")}</div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              {t("mégse")}</Button>
          )}
          <Button type="submit" disabled={isSubmitting} className="gap-2">
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                {t("létrehozás")}</>
            ) : (
              <>
                <IconTrophy className="w-4 h-4" />
                {t("verseny_létrehozása")}</>
            )}
          </Button>
        </div>
      </form>
    </Form>
  )
}

export default CreateTournamentFormEnhanced

