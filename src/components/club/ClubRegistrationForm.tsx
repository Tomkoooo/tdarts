"use client";
import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { IconUsers, IconLocation, IconBrowser, IconMail, IconPhone, IconPencil, IconMapPin } from '@tabler/icons-react';
import { useRouter } from '@/i18n/routing';
import toast from 'react-hot-toast';
import axios from 'axios';
import { Club } from '@/interface/club.interface';
import { useTranslations } from 'next-intl';

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
      const { name, description, contact } = data;
      
      await toast.promise(
        axios.post<Club>('/api/clubs/create', {
          creatorId: userId,
          clubData: {
            name,
            description,
            contact,
            location,
          },
        }, {
          headers: { 'Content-Type': 'application/json' },
        }),
        {
          loading: t('toast.loading'),
          success: (response) => {
            router.push(`/clubs/${response.data._id}`);
            return t('toast.success');
          },
          error: (error) => error.response?.data?.error || t('toast.error'),
        }
      );
    } catch (error) {
      console.error('Club creation error:', error);
    }
  };

  return (
    <div className="form-container">
      <div className="text-center mb-8">
        <div className="form-icon-container">
          <IconUsers className="form-icon" />
        </div>
        <h1 className="form-title">{t('title')}</h1>
        <p className="form-subtitle">{t('subtitle')}</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <label className="form-label">
            <span className="form-label-text">{t('name_label')}</span>
          </label>
          <div className="form-input-container">
            <IconUsers className="form-input-icon" />
            <input
              {...register('name')}
              type="text"
              placeholder={t('name_placeholder')}
              className="form-input"
              disabled={isSubmitting}
            />
          </div>
          {errors.name && <p className="form-error">{errors.name.message}</p>}
        </div>

        <div>
          <label className="form-label">
            <span className="form-label-text">{t('description_label')}</span>
          </label>
          <div className="form-input-container">
            <IconPencil className="form-input-icon"/>
            <textarea
              {...register('description')}
              placeholder={t('description_placeholder')}
              className="form-input min-h-[100px] resize-none"
              disabled={isSubmitting}
            />
          </div>
          {errors.description && <p className="form-error">{errors.description.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="form-label">
              <span className="form-label-text">{t('city_label')}</span>
            </label>
            <div className="form-input-container">
            <IconLocation className="form-input-icon"/>
              <input
                {...register('city')}
                type="text"
                placeholder={t('city_placeholder')}
                className="form-input"
                disabled={isSubmitting}
              />
            </div>
            {errors.city && <p className="form-error">{errors.city.message}</p>}
          </div>

          <div>
            <label className="form-label">
              <span className="form-label-text">{t('address_label')}</span>
            </label>
            <div className="form-input-container">
            <IconMapPin className="form-input-icon"/>
              <input
                {...register('address')}
                type="text"
                placeholder={t('address_placeholder')}
                className="form-input"
                disabled={isSubmitting}
              />
            </div>
            {errors.address && <p className="form-error">{errors.address.message}</p>}
          </div>
        </div>

        <div>
          <label className="form-label">
            <span className="form-label-text">{t('email_label')}</span>
          </label>
          <div className="form-input-container">
          <IconMail className="form-input-icon"/>
            <input
              {...register('contact.email')}
              type="email"
              placeholder="email@example.com"
              className="form-input"
              disabled={isSubmitting}
            />
          </div>
          {errors.contact?.email && <p className="form-error">{errors.contact.email.message}</p>}
        </div>

        <div>
          <label className="form-label">
            <span className="form-label-text">{t('phone_label')}</span>
          </label>
          <div className="form-input-container">
          <IconPhone className="form-input-icon"/>
            <input
              {...register('contact.phone')}
              type="text"
              placeholder="+36301234567"
              className="form-input"
              disabled={isSubmitting}
            />
          </div>
          {errors.contact?.phone && <p className="form-error">{errors.contact.phone.message}</p>}
        </div>

        <div>
          <label className="form-label">
            <span className="form-label-text">{t('website_label')}</span>
          </label>
          <div className="form-input-container">
          <IconBrowser className="form-input-icon"/>
            <input
              {...register('contact.website')}
              type="text"
              placeholder="https://example.com"
              className="form-input"
              disabled={isSubmitting}
            />
          </div>
          {errors.contact?.website && <p className="form-error">{errors.contact.website.message}</p>}
        </div>

        <button type="submit" className="form-button" disabled={isSubmitting}>
          {isSubmitting ? (
            <div className="form-button-loading">
              <span className="loading loading-spinner w-4 h-4"></span>
              <span>{t('submitting')}</span>
            </div>
          ) : (
            <div className="form-button-loading">
              <IconUsers className="form-button-icon" />
              <span>{t('submit')}</span>
            </div>
          )}
        </button>
      </form>
    </div>
  );
};

export default ClubRegistrationForm;