"use client"

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import axios from 'axios'
import toast from 'react-hot-toast'
import { Club } from '@/interface/club.interface'
import { IconDeviceFloppy } from '@tabler/icons-react'
import { Button } from '@/components/ui/Button'
import { Input } from "@/components/ui/Input"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { showErrorToast } from '@/lib/toastUtils'
import { useTranslations } from 'next-intl'

interface ClubGeneralSettingsProps {
  club: Club
  onClubUpdated: (club: Club) => void
  userId?: string
}

export default function ClubGeneralSettings({ club, onClubUpdated, userId }: ClubGeneralSettingsProps) {
  const t = useTranslations('Club.settings.general_form')

  const editClubSchema = z.object({
    name: z.string().min(1, t('validation.name_required')),
    location: z.string().min(1, t('validation.location_required')),
    country: z.string().optional(),
    contact: z
      .object({
        email: z.string().email(t('validation.email_invalid')).optional().or(z.literal('')),
        phone: z.string().optional(),
        website: z.string().url(t('validation.url_invalid')).optional().or(z.literal('')),
      })
      .optional(),
  })

  type EditClubFormData = z.infer<typeof editClubSchema>

  const form = useForm<EditClubFormData>({
    resolver: zodResolver(editClubSchema),
    defaultValues: {
      name: club.name,
      location: club.location,
      country: club.country || 'hu',
      contact: {
        email: club.contact?.email || '',
        phone: club.contact?.phone || '',
        website: club.contact?.website || '',
      },
    },
  })

  useEffect(() => {
    if (club) {
      form.reset({
        name: club.name,
        location: club.location,
        country: club.country || 'hu',
        contact: {
          email: club.contact?.email || '',
          phone: club.contact?.phone || '',
          website: club.contact?.website || '',
        },
      })
    }
  }, [club, form])

  const onSubmit = async (data: EditClubFormData) => {
    const toastId = toast.loading(t('toast.loading'))
    try {
      const response = await axios.post<Club>(`/api/clubs`, {
        userId,
        updates: { ...data, _id: club._id },
      })
      onClubUpdated(response.data)
      toast.success(t('toast.success'), { id: toastId })
    } catch (err: any) {
      toast.dismiss(toastId)
      showErrorToast(err.response?.data?.error || t('toast.error'), {
        error: err?.response?.data?.error,
        context: t('toast.context'),
        errorName: t('toast.error'),
      })
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('name')}</FormLabel>
              <FormControl>
                <Input placeholder={t('name')} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />



        <FormField
          control={form.control}
          name="location"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('location')}</FormLabel>
              <FormControl>
                <Input placeholder={t('location_placeholder')} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="country"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('country')}</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t('country_placeholder')} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="hu">Magyarország</SelectItem>
                  <SelectItem value="at">Ausztria</SelectItem>
                  <SelectItem value="de">Németország</SelectItem>
                  <SelectItem value="sk">Szlovákia</SelectItem>
                  <SelectItem value="ro">Románia</SelectItem>
                  <SelectItem value="hr">Horvátország</SelectItem>
                  <SelectItem value="si">Szlovénia</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="contact.email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('email')}</FormLabel>
                <FormControl>
                  <Input type="email" placeholder={t("email_example_com_oyiv")} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="contact.phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('phone')}</FormLabel>
                <FormControl>
                  <Input placeholder="+36301234567" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="contact.website"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('website')}</FormLabel>
              <FormControl>
                <Input placeholder={t("https_example_com_ags5")} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        </div>

        <div className="flex justify-end">
          <Button type="submit" size="sm" className="w-full sm:w-auto shadow-lg shadow-primary/30">
            <IconDeviceFloppy className="mr-2 h-4 w-4" />
            {t('save')}
          </Button>
        </div>
      </form>
    </Form>
  )
}
