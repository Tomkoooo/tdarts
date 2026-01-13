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
import { showErrorToast } from '@/lib/toastUtils'

const editClubSchema = z.object({
  name: z.string().min(1, 'A klub neve kötelező'),
  location: z.string().min(1, 'A helyszín kötelező'),
  contact: z
    .object({
      email: z.string().email('Érvényes email címet adj meg').optional().or(z.literal('')),
      phone: z.string().optional(),
      website: z.string().url('Érvényes weboldal URL-t adj meg').optional().or(z.literal('')),
    })
    .optional(),
})

type EditClubFormData = z.infer<typeof editClubSchema>

interface ClubGeneralSettingsProps {
  club: Club
  onClubUpdated: (club: Club) => void
  userId?: string
}

export default function ClubGeneralSettings({ club, onClubUpdated, userId }: ClubGeneralSettingsProps) {
  const form = useForm<EditClubFormData>({
    resolver: zodResolver(editClubSchema),
    defaultValues: {
      name: club.name,
      location: club.location,
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
        contact: {
          email: club.contact?.email || '',
          phone: club.contact?.phone || '',
          website: club.contact?.website || '',
        },
      })
    }
  }, [club, form])

  const onSubmit = async (data: EditClubFormData) => {
    const toastId = toast.loading('Klub adatok frissítése...')
    try {
      const response = await axios.post<Club>(`/api/clubs`, {
        userId,
        updates: { ...data, _id: club._id },
      })
      onClubUpdated(response.data)
      toast.success('Klub adatok sikeresen frissítve!', { id: toastId })
    } catch (err: any) {
      toast.dismiss(toastId)
      showErrorToast(err.response?.data?.error || 'Klub frissítése sikertelen', {
        error: err?.response?.data?.error,
        context: 'Klub szerkesztése',
        errorName: 'Klub frissítése sikertelen',
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
              <FormLabel>Klub neve</FormLabel>
              <FormControl>
                <Input placeholder="Klub neve" {...field} />
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
              <FormLabel>Helyszín</FormLabel>
              <FormControl>
                <Input placeholder="Város, cím" {...field} />
              </FormControl>
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
                <FormLabel>Kapcsolat email</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="email@example.com" {...field} />
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
                <FormLabel>Telefonszám</FormLabel>
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
              <FormLabel>Weboldal</FormLabel>
              <FormControl>
                <Input placeholder="https://example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        </div>

        <div className="flex justify-end">
          <Button type="submit" size="sm" className="w-full sm:w-auto shadow-lg shadow-primary/30">
            <IconDeviceFloppy className="mr-2 h-4 w-4" />
            Mentés
          </Button>
        </div>
      </form>
    </Form>
  )
}
