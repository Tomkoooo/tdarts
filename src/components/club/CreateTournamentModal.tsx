import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import axios from 'axios';
import toast from 'react-hot-toast';
import { IconSearch, IconPlus, IconX } from '@tabler/icons-react';
import { Club } from '@/interface/club.interface';
import { useState } from 'react';

const formSchema = z.object({
  name: z.string().min(1, 'A torna neve kötelező'),
  boardCount: z.number().min(1, 'Legalább egy tábla szükséges'),
  description: z.string().optional(),
  startTime: z.string().optional(),
  participants: z.array(z.object({ name: z.string().min(1, 'A név kötelező'), userId: z.string().optional() })),
});

type FormValues = z.infer<typeof formSchema>;

interface CreateTournamentModalProps {
  isOpen: boolean;
  onClose: () => void;
  clubId: string;
  members: { _id: string; name: string; username: string }[];
  players: { name: string }[];
  club: Club;
  onClubUpdated: (club: Club) => void;
}

export default function CreateTournamentModal({ isOpen, onClose, clubId, members, players, onClubUpdated, club }: CreateTournamentModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [playerSuggestions, setPlayerSuggestions] = useState<{ _id: string; name: string; username: string }[]>([]);
  const [addedParticipants, setAddedParticipants] = useState<{ name: string; userId?: string }[]>([]);

  const { register, control, handleSubmit, formState: { errors }, reset } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      boardCount: 1,
      description: '',
      startTime: '',
      participants: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'participants',
  });

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setPlayerSuggestions([]);
      return;
    }
    try {
      const response = await axios.get<{ players: { _id: string; name: string; username: string }[] }>(`/api/clubs/search?query=${encodeURIComponent(query)}`);
      setPlayerSuggestions(response.data.players.filter(p => !members.some(m => m._id === p._id)));
    } catch (error) {
      toast.error('Játékosok keresése sikertelen');
    }
  };

  const addParticipant = (participant: { name: string; userId?: string }) => {
    if (addedParticipants.some(p => p.name.toLowerCase() === participant.name.toLowerCase())) {
      toast.error('Ez a résztvevő már hozzá van adva');
      return;
    }
    append(participant);
    setAddedParticipants(prev => [...prev, participant].sort((a, b) => a.name.localeCompare(b.name, 'hu', { sensitivity: 'base' })));
    setSearchQuery('');
    setPlayerSuggestions([]);
  };

  const removeParticipant = (name: string) => {
    const index = fields.findIndex(f => f.name === name);
    if (index !== -1) remove(index);
    setAddedParticipants(prev => prev.filter(p => p.name !== name));
  };

  const onSubmit = async (data: FormValues) => {
    const toastId = toast.loading('Torna létrehozása...');
    try {
      const response = await axios.post<{ tournament: { _id: string; code: string; name: string; status: string; createdAt: Date } }>(
        `/api/clubs/${clubId}/createTournament`,
        { ...data }
      );
      onClubUpdated({
        ...club,
        tournaments: [...(club.tournaments || []), response.data.tournament],
      });
      reset();
      setAddedParticipants([]);
      onClose();
      toast.success('Torna sikeresen létrehozva!', { id: toastId });
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Torna létrehozása sikertelen', { id: toastId });
    }
  };

  return (
    <dialog open={isOpen} className="modal">
      <div className="modal-box glass-card p-8 bg-[hsl(var(--background)/0.3)] border-[hsl(var(--border)/0.5)] shadow-[0_8px_32px_rgba(0,0,0,0.2)] rounded-xl max-w-2xl">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-[hsl(0,80%,60%)] to-[hsl(20,80%,60%)] bg-clip-text text-transparent mb-4">
          Új Torna Létrehozása
        </h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="form-control">
            <label className="label">
              <span className="label-text text-[hsl(var(--foreground))] font-medium">Torna neve</span>
            </label>
            <input
              type="text"
              {...register('name')}
              className="input input-bordered w-full bg-[hsl(var(--background)/0.5)] border-[hsl(var(--border)/0.5)] focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] transition-all duration-200"
              placeholder="Add meg a torna nevét"
            />
            {errors.name && <p className="text-error italic text-sm mt-1">{errors.name.message}</p>}
          </div>
          <div className="form-control">
            <label className="label">
              <span className="label-text text-[hsl(var(--foreground))] font-medium">Táblák száma</span>
            </label>
            <input
              type="number"
              {...register('boardCount', { valueAsNumber: true })}
              className="input input-bordered w-full bg-[hsl(var(--background)/0.5)] border-[hsl(var(--border)/0.5)] focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] transition-all duration-200"
              placeholder="Add meg a táblák számát"
              min="1"
            />
            {errors.boardCount && <p className="text-error italic text-sm mt-1">{errors.boardCount.message}</p>}
          </div>
          <div className="form-control">
            <label className="label">
              <span className="label-text text-[hsl(var(--foreground))] font-medium">Leírás (opcionális)</span>
            </label>
            <textarea
              {...register('description')}
              className="textarea textarea-bordered w-full bg-[hsl(var(--background)/0.5)] border-[hsl(var(--border)/0.5)] focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] transition-all duration-200"
              placeholder="Add meg a torna leírását"
            />
          </div>
          <div className="form-control">
            <label className="label">
              <span className="label-text text-[hsl(var(--foreground))] font-medium">Kezdési idő (opcionális)</span>
            </label>
            <input
              type="datetime-local"
              {...register('startTime')}
              className="input input-bordered w-full bg-[hsl(var(--background)/0.5)] border-[hsl(var(--border)/0.5)] focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] transition-all duration-200"
            />
          </div>
          <div className="form-control">
            <label className="label">
              <span className="label-text text-[hsl(var(--foreground))] font-medium">Résztvevők hozzáadása</span>
            </label>
            <div className="flex gap-2 mb-2">
              <div className="relative flex-1">
                <IconSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[hsl(var(--muted-foreground))]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="input input-bordered w-full pl-10 bg-[hsl(var(--background)/0.5)] border-[hsl(var(--border)/0.5)] focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] transition-all duration-200"
                  placeholder="Keresés név vagy felhasználónév alapján"
                />
                {playerSuggestions.length > 0 && (
                  <ul className="absolute z-10 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-md mt-1 w-full max-h-40 overflow-auto">
                    {playerSuggestions.map(player => (
                      <li
                        key={player._id}
                        className="p-2 hover:bg-[hsl(var(--primary)/0.2)] hover:text-[hsl(var(--primary))] cursor-pointer"
                        onClick={() => addParticipant({ name: player.name, userId: player._id })}
                      >
                        {player.name} ({player.username})
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <button
                type="button"
                className="glass-button btn btn-sm bg-gradient-to-r from-[hsl(0,80%,60%)] to-[hsl(20,80%,60%)] hover:scale-105 transition-all duration-300"
                onClick={() => {
                  if (searchQuery) addParticipant({ name: searchQuery });
                }}
              >
                Hozzáad
              </button>
            </div>
            {addedParticipants.length > 0 && (
              <div className="mt-4 bg-[hsl(var(--background)/0.5)] p-4 rounded-md">
                <label className="label">
                  <span className="label-text text-[hsl(var(--foreground))] font-medium">Hozzáadott résztvevők</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {addedParticipants.map(participant => (
                    <div
                      key={participant.name}
                      className={`badge ${participant.userId ? 'badge-primary' : 'badge-secondary'} badge-lg gap-2`}
                    >
                      {participant.name}
                      <button
                        type="button"
                        className="text-xs"
                        onClick={() => removeParticipant(participant.name)}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
              className="glass-button btn btn-sm bg-gradient-to-r from-[hsl(0,80%,60%)] to-[hsl(20,80%,60%)] hover:scale-105 transition-all duration-300"
            >
              Létrehozás
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