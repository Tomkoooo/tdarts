import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import axios from 'axios'
import toast from 'react-hot-toast'
import { Club } from '@/interface/club.interface'
import { IconPencil } from '@tabler/icons-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/Button'
import { Input } from "@/components/ui/Input"
import { Textarea } from '@/components/ui/textarea'
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
  description: z.string().optional(),
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

interface EditClubModalProps {
  isOpen: boolean
  onClose: () => void
  club: Club
  onClubUpdated: (club: Club) => void
  userId?: string
}

export default function EditClubModal({ isOpen, onClose, club, onClubUpdated, userId }: EditClubModalProps) {
  const form = useForm<EditClubFormData>({
    resolver: zodResolver(editClubSchema),
    defaultValues: {
      name: club.name,
      description: club.description,
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
        description: club.description,
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
      onClose()
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
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col bg-gradient-to-br from-card/98 to-card/95 backdrop-blur-xl shadow-2xl shadow-primary/20">
        <DialogHeader className="flex-shrink-0 bg-gradient-to-r from-primary/10 to-transparent px-4 md:px-6 py-3 md:py-4 shadow-sm shadow-primary/10">
          <DialogTitle className="text-xl md:text-2xl">Klub szerkesztése</DialogTitle>
          <DialogDescription className="text-sm">
            Frissítsd a klubod alapadatait, hogy a tagok naprakész információkat lássanak.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col overflow-hidden flex-1">
            <div className="space-y-4 overflow-y-auto px-4 md:px-6 py-4 flex-1">
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
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Leírás</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <IconPencil size={16} className="absolute left-3 top-3 text-muted-foreground pointer-events-none" />
                      <Textarea placeholder="Írj néhány szót a klubról" rows={4} className="pl-10" {...field} />
                    </div>
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

            <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-between gap-2 flex-shrink-0 bg-gradient-to-r from-transparent to-primary/5 px-4 md:px-6 py-3 md:py-4 shadow-[0_-4px_12px_rgba(0,0,0,0.1)]">
              <Button type="button" variant="ghost" size="sm" onClick={onClose} className="w-full sm:w-auto md:size-default">
                Mégse
              </Button>
              <Button type="submit" size="sm" className="w-full sm:w-auto md:size-default shadow-lg shadow-primary/30">
                Mentés
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}