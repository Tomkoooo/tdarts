"use client";
import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { IconUsers, IconLocation, IconBrowser, IconMail, IconPhone, IconPencil, IconMapPin } from '@tabler/icons-react';
import { useRouter } from '@/i18n/routing';
import toast from 'react-hot-toast';
import { createClubAction } from '@/features/clubs/actions/createClub.action';
import { Club } from '@/interface/club.interface';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/Label';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

interface ClubRegistrationFormProps {
  userId: string;
}

const ClubRegistrationForm: React.FC<ClubRegistrationFormProps> = ({ userId }) => {
  const t = useTranslations('Club.registration');
  const router = useRouter();

  const clubSchema = z.object({
    name: z.string().min(3, t('validation.name_min')),
    description: z.string().min(10, t('validation.desc_min')),
    city: z.string().min(1, t('validation.city_required')),
    address: z.string().min(1, t('validation.address_required')),
    country: z.string().min(2, t('validation.country_required')),
    contact: z.object({
      email: z.string().email(t('validation.email_invalid')).optional().or(z.literal('')),
      phone: z.string().optional(),
      website: z.string().url(t('validation.url_invalid')).optional().or(z.literal('')),
    }).optional(),
  });

  type ClubFormData = z.infer<typeof clubSchema>;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ClubFormData>({
    resolver: zodResolver(clubSchema),
    defaultValues: {
      name: '',
      description: '',
      city: '',
      address: '',
      country: 'hu',
      contact: {
        email: '',
        phone: '',
        website: '',
      },
    },
  });



  const onSubmit = async (data: ClubFormData) => {
    try {
      const location = `${data.city}, ${data.address}`;
      const { name, description, contact, country } = data;
      
      const club = await toast.promise(
        createClubAction({
          creatorId: userId,
          clubData: {
            name,
            description,
            contact,
            location,
            country,
          },
        }),
        {
          loading: t('toast.loading'),
          success: t('toast.success'),
          error: (err: { message?: string }) => err?.message || t('toast.error'),
        }
      );
      if (club && typeof club === 'object' && '_id' in club) {
        router.push(`/clubs/${(club as unknown as Club)._id}`);
      }
    } catch (error) {
      console.error('Club creation error:', error);
    }
  };

  return (
    <Card className="border-border/60 bg-card/80 backdrop-blur-xl shadow-xl">
      <CardHeader className="text-center space-y-3">
        <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
          <IconUsers className="w-7 h-7 text-primary" />
        </div>
        <div>
          <CardTitle className="text-2xl">{t('title')}</CardTitle>
          <CardDescription className="mt-2 text-base">{t('subtitle')}</CardDescription>
        </div>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-2">
            <Label>{t('name_label')}</Label>
            <div className="relative">
              <IconUsers className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                {...register('name')}
                type="text"
                placeholder={t('name_placeholder')}
                className={cn("pl-10", errors.name && "border-destructive focus-visible:ring-destructive")}
                disabled={isSubmitting}
              />
            </div>
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>{t('description_label')}</Label>
            <div className="relative">
              <IconPencil className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Textarea
                {...register('description')}
                placeholder={t('description_placeholder')}
                className={cn("pl-10 min-h-[120px] resize-none", errors.description && "border-destructive focus-visible:ring-destructive")}
                disabled={isSubmitting}
              />
            </div>
            {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>{t('country_label')}</Label>
            <div className="relative">
              <IconLocation className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <select
                {...register('country')}
                className={cn(
                  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pl-10 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                  errors.country && "border-destructive focus-visible:ring-destructive"
                )}
                disabled={isSubmitting}
              >
                <option value="hu">{t("magyarorszag_fm30")}</option>
                <option value="at">{t("ausztria_okn5")}</option>
                <option value="de">{t("nemetorszag_vpgb")}</option>
                <option value="sk">{t("szlovakia_o5lp")}</option>
                <option value="ro">{t("romania_kni2")}</option>
                <option value="hr">{t("horvatorszag_86m1")}</option>
                <option value="si">{t("szlovenia_o5gj")}</option>
              </select>
            </div>
            {errors.country && <p className="text-sm text-destructive">{errors.country.message}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('city_label')}</Label>
              <div className="relative">
                <IconLocation className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  {...register('city')}
                  type="text"
                  placeholder={t('city_placeholder')}
                  className={cn("pl-10", errors.city && "border-destructive focus-visible:ring-destructive")}
                  disabled={isSubmitting}
                />
              </div>
              {errors.city && <p className="text-sm text-destructive">{errors.city.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>{t('address_label')}</Label>
              <div className="relative">
                <IconMapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  {...register('address')}
                  type="text"
                  placeholder={t('address_placeholder')}
                  className={cn("pl-10", errors.address && "border-destructive focus-visible:ring-destructive")}
                  disabled={isSubmitting}
                />
              </div>
              {errors.address && <p className="text-sm text-destructive">{errors.address.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t('email_label')}</Label>
            <div className="relative">
              <IconMail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                {...register('contact.email')}
                type="email"
                placeholder={t("email_example_com_oyiv")}
                className={cn("pl-10", errors.contact?.email && "border-destructive focus-visible:ring-destructive")}
                disabled={isSubmitting}
              />
            </div>
            {errors.contact?.email && <p className="text-sm text-destructive">{errors.contact.email.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>{t('phone_label')}</Label>
            <div className="relative">
              <IconPhone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                {...register('contact.phone')}
                type="text"
                placeholder="+36301234567"
                className={cn("pl-10", errors.contact?.phone && "border-destructive focus-visible:ring-destructive")}
                disabled={isSubmitting}
              />
            </div>
            {errors.contact?.phone && <p className="text-sm text-destructive">{errors.contact.phone.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>{t('website_label')}</Label>
            <div className="relative">
              <IconBrowser className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                {...register('contact.website')}
                type="text"
                placeholder={t("https_example_com_ags5")}
                className={cn("pl-10", errors.contact?.website && "border-destructive focus-visible:ring-destructive")}
                disabled={isSubmitting}
              />
            </div>
            {errors.contact?.website && <p className="text-sm text-destructive">{errors.contact.website.message}</p>}
          </div>

          <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
            <div className="inline-flex items-center gap-2">
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  <span>{t('submitting')}</span>
                </>
              ) : (
                <>
                  <IconUsers className="w-4 h-4" />
                  <span>{t('submit')}</span>
                </>
              )}
            </div>
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default ClubRegistrationForm;