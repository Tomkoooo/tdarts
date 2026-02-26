"use client";
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { IconMail, IconLock, IconBrandGoogle, IconX } from '@tabler/icons-react';
import axios from 'axios';
import { useUserContext } from '@/hooks/useUser';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

interface GoogleAccountLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  googleEmail: string;
  googleName: string;
}

export default function GoogleAccountLinkModal({ 
  isOpen, 
  onClose, 
  googleEmail, 
  googleName 
}: GoogleAccountLinkModalProps) {
  const t = useTranslations('Auth');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setUser } = useUserContext();
  const router = useRouter();

  const linkSchema = z.object({
    email: z.string().email(t('validation.email_invalid')).min(1, t('validation.email_required')),
    password: z.string().min(1, t('validation.password_required')),
  });

  type LinkFormData = z.infer<typeof linkSchema>;

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue
  } = useForm<LinkFormData>({
    resolver: zodResolver(linkSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  // Automatikusan kitöltjük az email mezőt
  React.useEffect(() => {
    if (googleEmail) {
      setValue('email', googleEmail);
    }
  }, [googleEmail, setValue]);

  const onSubmit = async (data: LinkFormData) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await axios.post('/api/auth/link-google', data);
      
      if (response.data.success) {
        setUser(response.data.user);
        onClose();
        router.push('/');
      }
    } catch (error: any) {
      console.error('Account linking error:', error);
      setError(error.response?.data?.error || t('link.error_generic'));
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-base-200 rounded-xl p-6 shadow-xl w-full max-w-md border border-[hsl(var(--border) / 0.3)]">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
              <IconBrandGoogle className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold">{t('link.title')}</h2>
              <p className="text-sm text-base-content/60">{t('link.subtitle')}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="btn btn-sm btn-ghost btn-circle"
          >
            <IconX className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-6 p-4 bg-base-300 rounded-lg border border-[hsl(var(--border) / 0.5)]">
          <p className="text-sm text-base-content/70 mb-2">
            {t('link.google_data')}
          </p>
          <div className="flex items-center gap-2">
            <IconMail className="w-4 h-4 text-primary" />
            <span className="font-medium">{googleEmail}</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm text-base-content/60">{t('link.name', { name: googleName })}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="label">
              <span className="label-text font-medium">{t('link.email_label')}</span>
            </label>
            <div className="relative">
              <IconMail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-base-content/50" />
              <input
                {...register('email')}
                type="email"
                className="input input-bordered w-full pl-10 bg-base-100/50"
                disabled={isLoading}
              />
            </div>
            {errors.email && (
              <p className="text-error text-sm mt-1 italic">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label className="label">
              <span className="label-text font-medium">{t('link.password_label')}</span>
            </label>
            <div className="relative">
              <IconLock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-base-content/50" />
              <input
                {...register('password')}
                type="password"
                className="input input-bordered w-full pl-10 bg-base-100/50"
                disabled={isLoading}
              />
            </div>
            {errors.password && (
              <p className="text-error text-sm mt-1 italic">{errors.password.message}</p>
            )}
          </div>

          {error && (
            <div className="alert alert-error bg-error/10 border-error/20 text-error text-sm py-3">
              <span>{error}</span>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-ghost flex-1 border border-base-content/10 hover:bg-base-content/5"
              disabled={isLoading}
            >
              {t('link.cancel')}
            </button>
            <button
              type="submit"
              className="btn btn-primary glass-button flex-1"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <span className="loading loading-spinner w-4 h-4"></span>
                  <span>{t('link.linking')}</span>
                </div>
              ) : (
                t('link.submit')
              )}
            </button>
          </div>
        </form>

        <div className="mt-6 text-center">
          <p className="text-xs text-base-content/60 leading-relaxed">
            {t('link.footer')}
          </p>
        </div>
      </div>
    </div>
  );
}
