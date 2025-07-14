"use client";
import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { IconUsers, IconLocation, IconBrowser, IconMail, IconPhone, IconPencil } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import axios from 'axios';
import { Club } from '@/interface/club.interface';

const clubSchema = z.object({
  name: z.string().min(3, 'A klub neve minimum 3 karakter legyen').regex(/^[^\s]+$/, 'A klub neve nem tartalmazhat szóközt'),
  description: z.string().min(10, 'A leírás minimum 10 karakter legyen'),
  location: z.string().min(3, 'A helyszín minimum 3 karakter legyen'),
  contact: z.object({
    email: z.string().email('Érvényes email címet adj meg').optional().or(z.literal('')),
    phone: z.string().optional(),
    website: z.string().url('Érvényes weboldal URL-t adj meg').optional().or(z.literal('')),
  }).optional(),
});

type ClubFormData = z.infer<typeof clubSchema>;

interface ClubRegistrationFormProps {
  userId: string;
}

const ClubRegistrationForm: React.FC<ClubRegistrationFormProps> = ({ userId }) => {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ClubFormData>({
    resolver: zodResolver(clubSchema),
    defaultValues: {
      name: '',
      description: '',
      location: '',
      contact: {
        email: '',
        phone: '',
        website: '',
      },
    },
  });

  const onSubmit = async (data: ClubFormData) => {
    try {
      await toast.promise(
        axios.post<Club>('/api/clubs', { creatorId: userId, clubData: data }, {
          headers: { 'Content-Type': 'application/json' },
        }),
        {
          loading: 'Klub létrehozása folyamatban...',
          success: (response) => {
            router.push(`/club/${response.data._id}`);
            return 'Klub sikeresen létrehozva!';
          },
          error: (error) => error.response?.data?.error || 'Hiba történt a klub létrehozása során',
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
        <h1 className="form-title">Klub Regisztrálása</h1>
        <p className="form-subtitle">Töltsd ki az adatokat az új klub létrehozásához</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <label className="form-label">
            <span className="form-label-text">Klub neve</span>
          </label>
          <div className="form-input-container">
            <IconUsers className="form-input-icon" />
            <input
              {...register('name')}
              type="text"
              placeholder="Klub neve"
              className="form-input"
              disabled={isSubmitting}
            />
          </div>
          {errors.name && <p className="form-error">{errors.name.message}</p>}
        </div>

        <div>
          <label className="form-label">
            <span className="form-label-text">Leírás</span>
          </label>
          <div className="form-input-container">
            <IconPencil className="form-input-icon"/>
            <textarea
              {...register('description')}
              placeholder="Klub leírása"
              className="form-input min-h-[100px] resize-none"
              disabled={isSubmitting}
            />
          </div>
          {errors.description && <p className="form-error">{errors.description.message}</p>}
        </div>

        <div>
          <label className="form-label">
            <span className="form-label-text">Helyszín</span>
          </label>
          <div className="form-input-container">
          <IconLocation className="form-input-icon"/>
            <input
              {...register('location')}
              type="text"
              placeholder="Helyszín"
              className="form-input"
              disabled={isSubmitting}
            />
          </div>
          {errors.location && <p className="form-error">{errors.location.message}</p>}
        </div>

        <div>
          <label className="form-label">
            <span className="form-label-text">Kapcsolat email (opcionális)</span>
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
            <span className="form-label-text">Telefonszám (opcionális)</span>
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
            <span className="form-label-text">Weboldal (opcionális)</span>
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
              <span>Létrehozás...</span>
            </div>
          ) : (
            <div className="form-button-loading">
              <IconUsers className="form-button-icon" />
              <span>Klub létrehozása</span>
            </div>
          )}
        </button>
      </form>
    </div>
  );
};

export default ClubRegistrationForm;