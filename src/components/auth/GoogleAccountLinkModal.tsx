"use client";
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { IconMail, IconLock, IconBrandGoogle, IconX } from '@tabler/icons-react';
import axios from 'axios';
import { useUserContext } from '@/hooks/useUser';
import { useRouter } from 'next/navigation';

const linkSchema = z.object({
  email: z.string().email('Érvényes email címet adj meg').min(1, 'Email cím kötelező'),
  password: z.string().min(1, 'Jelszó kötelező'),
});

type LinkFormData = z.infer<typeof linkSchema>;

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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setUser } = useUserContext();
  const router = useRouter();

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
      setError(error.response?.data?.error || 'Hiba történt a fiók összekapcsolása során');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-base-200 rounded-xl p-6 shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
              <IconBrandGoogle className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Google fiók összekapcsolása</h2>
              <p className="text-sm text-base-content/60">Kapcsold össze a Google fiókodat</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="btn btn-sm btn-ghost btn-circle"
          >
            <IconX className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-6 p-4 bg-base-300 rounded-lg">
          <p className="text-sm text-base-content/70 mb-2">
            A Google fiókod adatai:
          </p>
          <div className="flex items-center gap-2">
            <IconMail className="w-4 h-4 text-primary" />
            <span className="font-medium">{googleEmail}</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm text-base-content/60">Név: {googleName}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="label">
              <span className="label-text font-medium">Email cím</span>
            </label>
            <div className="relative">
              <IconMail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-base-content/50" />
              <input
                {...register('email')}
                type="email"
                className="input input-bordered w-full pl-10"
                disabled={isLoading}
              />
            </div>
            {errors.email && (
              <p className="text-error text-sm mt-1">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label className="label">
              <span className="label-text font-medium">Jelszó</span>
            </label>
            <div className="relative">
              <IconLock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-base-content/50" />
              <input
                {...register('password')}
                type="password"
                className="input input-bordered w-full pl-10"
                disabled={isLoading}
              />
            </div>
            {errors.password && (
              <p className="text-error text-sm mt-1">{errors.password.message}</p>
            )}
          </div>

          {error && (
            <div className="alert alert-error">
              <span>{error}</span>
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-ghost flex-1"
              disabled={isLoading}
            >
              Mégse
            </button>
            <button
              type="submit"
              className="btn btn-primary flex-1"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <span className="loading loading-spinner w-4 h-4"></span>
                  <span>Összekapcsolás...</span>
                </div>
              ) : (
                'Összekapcsolás'
              )}
            </button>
          </div>
        </form>

        <div className="mt-4 text-center">
          <p className="text-xs text-base-content/60">
            A Google fiókod össze lesz kapcsolva a meglévő felhasználói fiókoddal.
            Ezután mindkét módon be tudsz jelentkezni.
          </p>
        </div>
      </div>
    </div>
  );
}
