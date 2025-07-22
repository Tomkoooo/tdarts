"use client";
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { IconUsers, IconLocation, IconBrowser, IconMail, IconPhone, IconPencil } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import axios from 'axios';
import { Club } from '@/interface/club.interface';
import PlayerSearch from './PlayerSearch';

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

  const [boards, setBoards] = useState([{ boardNumber: 1, name: '', isActive: true }]);
  const [players, setPlayers] = useState<any[]>([]);

  const handleAddBoard = () => {
    setBoards(prev => [...prev, { boardNumber: prev.length + 1, name: '', isActive: true }]);
  };
  const handleRemoveBoard = () => {
    setBoards(prev => prev.length > 1 ? prev.slice(0, -1) : prev);
  };
  const handleBoardNameChange = (idx: number, name: string) => {
    setBoards(prev => prev.map((b, i) => i === idx ? { ...b, name } : b));
  };
  const handlePlayerSelected = (player: any) => {
    if (!players.some(p => p._id === player._id)) setPlayers(prev => [...prev, player]);
  };

  const onSubmit = async (data: ClubFormData) => {
    try {
      await toast.promise(
        axios.post<Club>('/api/clubs/create', {
          creatorId: userId,
          clubData: { ...data, boards, players },
        }, {
          headers: { 'Content-Type': 'application/json' },
        }),
        {
          loading: 'Klub létrehozása folyamatban...',
          success: (response) => {
            router.push(`/clubs/${response.data._id}`);
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

        <div className="mb-4">
          <label className="form-label">Táblák száma</label>
          <div className="flex gap-2 items-center">
            <button type="button" className="btn btn-sm" onClick={handleRemoveBoard}>-</button>
            <span>{boards.length}</span>
            <button type="button" className="btn btn-sm" onClick={handleAddBoard}>+</button>
          </div>
          <ul className="mt-2 space-y-1">
            {boards.map((board, idx) => (
              <li key={board.boardNumber} className="flex gap-2 items-center">
                <span className="w-6">#{board.boardNumber}</span>
                <input
                  type="text"
                  className="input input-sm"
                  placeholder="Tábla neve (opcionális)"
                  value={board.name}
                  onChange={e => handleBoardNameChange(idx, e.target.value)}
                />
                <span className="text-xs text-muted">{board.isActive ? 'Aktív' : 'Inaktív'}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="mb-4">
          <label className="form-label">Játékosok hozzáadása</label>
          <PlayerSearch onPlayerSelected={handlePlayerSelected} />
          <ul className="mt-2 space-y-1">
            {players.map(player => (
              <li key={player._id} className="flex gap-2 items-center">
                <span>{player.name}</span>
                {player.isGuest && <span className="text-xs text-muted">vendég</span>}
              </li>
            ))}
          </ul>
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