import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Club } from '@/interface/club.interface';

const editClubSchema = z.object({
  name: z.string().min(1, 'A klub neve kötelező'),
  description: z.string().optional(),
  location: z.string().min(1, 'A helyszín kötelező'),
  contact: z.object({
    email: z.string().email('Érvényes email címet adj meg').optional().or(z.literal('')),
    phone: z.string().optional(),
    website: z.string().url('Érvényes weboldal URL-t adj meg').optional().or(z.literal('')),
  }).optional(),
});

type EditClubFormData = z.infer<typeof editClubSchema>;

interface EditClubModalProps {
  isOpen: boolean;
  onClose: () => void;
  club: Club;
  onClubUpdated: (club: Club) => void;
  userId?: string
}

export default function EditClubModal({ isOpen, onClose, club, onClubUpdated, userId }: EditClubModalProps) {
  const { register, handleSubmit, formState: { errors } } = useForm<EditClubFormData>({
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
  });

  const onSubmit = async (data: EditClubFormData) => {
    const toastId = toast.loading('Klub adatok frissítése...');
    try {
      const response = await axios.post<Club>(`/api/clubs`, {
        userId,
        updates: { ...data, _id: club._id },
      });
      onClubUpdated(response.data);
      onClose();
      toast.success('Klub adatok sikeresen frissítve!', { id: toastId });
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Klub frissítése sikertelen', { id: toastId });
    }
  };

  return (
    <dialog open={isOpen} className="modal">
      <div className="modal-box glass-card p-8 bg-[hsl(var(--background)/0.3)] border-[hsl(var(--border)/0.5)] shadow-[0_8px_32px_rgba(0,0,0,0.2)] rounded-xl max-w-md">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-[hsl(0,80%,60%)] to-[hsl(20,80%,60%)] bg-clip-text text-transparent mb-4">
          Klub Szerkesztése
        </h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="form-control">
            <label className="label">
              <span className="label-text text-[hsl(var(--foreground))] font-medium">Klub neve</span>
            </label>
            <input
              type="text"
              {...register('name')}
              className="input input-bordered w-full bg-[hsl(var(--background)/0.5)] border-[hsl(var(--border)/0.5)] focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] transition-all duration-200"
              placeholder="Klub neve"
            />
            {errors.name && <p className="text-error italic text-sm mt-1">{errors.name.message}</p>}
          </div>
          <div className="form-control">
            <label className="label">
              <span className="label-text text-[hsl(var(--foreground))] font-medium">Leírás</span>
            </label>
            <textarea
              {...register('description')}
              className="textarea textarea-bordered w-full bg-[hsl(var(--background)/0.5)] border-[hsl(var(--border)/0.5)] focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] transition-all duration-200"
              placeholder="Klub leírása"
            />
          </div>
          <div className="form-control">
            <label className="label">
              <span className="label-text text-[hsl(var(--foreground))] font-medium">Helyszín</span>
            </label>
            <input
              type="text"
              {...register('location')}
              className="input input-bordered w-full bg-[hsl(var(--background)/0.5)] border-[hsl(var(--border)/0.5)] focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] transition-all duration-200"
              placeholder="Helyszín"
            />
            {errors.location && <p className="text-error italic text-sm mt-1">{errors.location.message}</p>}
          </div>
          <div className="form-control">
            <label className="label">
              <span className="label-text text-[hsl(var(--foreground))] font-medium">Kapcsolat email (opcionális)</span>
            </label>
            <input
              type="email"
              {...register('contact.email')}
              className="input input-bordered w-full bg-[hsl(var(--background)/0.5)] border-[hsl(var(--border)/0.5)] focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] transition-all duration-200"
              placeholder="email@example.com"
            />
            {errors.contact?.email && <p className="text-error italic text-sm mt-1">{errors.contact.email.message}</p>}
          </div>
          <div className="form-control">
            <label className="label">
              <span className="label-text text-[hsl(var(--foreground))] font-medium">Telefonszám (opcionális)</span>
            </label>
            <input
              type="text"
              {...register('contact.phone')}
              className="input input-bordered w-full bg-[hsl(var(--background)/0.5)] border-[hsl(var(--border)/0.5)] focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] transition-all duration-200"
              placeholder="+36301234567"
            />
          </div>
          <div className="form-control">
            <label className="label">
              <span className="label-text text-[hsl(var(--foreground))] font-medium">Weboldal (opcionális)</span>
            </label>
            <input
              type="text"
              {...register('contact.website')}
              className="input input-bordered w-full bg-[hsl(var(--background)/0.5)] border-[hsl(var(--border)/0.5)] focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] transition-all duration-200"
              placeholder="https://example.com"
            />
            {errors.contact?.website && <p className="text-error italic text-sm mt-1">{errors.contact.website.message}</p>}
          </div>
          <div className="modal-action">
            <button
              type="button"
              onClick={onClose}
              className="glass-button btn btn-sm btn-ghost"
            >
              Mégse
            </button>
            <button
              type="submit"
              className="btn btn-primary btn-outline btn-sm"
            >
              Mentés
            </button>
          </div>
        </form>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button onClick={onClose}>close</button>
      </form>
    </dialog>
  );
}