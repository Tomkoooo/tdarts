import { useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { IconSearch } from '@tabler/icons-react';
import { Club } from '@/interface/club.interface';

interface AddPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  clubId: string;
  userId?: string;
  existingMembers: { _id: string; name: string; username: string }[];
  existingPlayers: { name: string }[];
  onClubUpdated: (club: Club) => void;
  userRole: 'admin' | 'moderator' | 'member' | 'none';
}

export default function AddPlayerModal({ isOpen, onClose, clubId, userId, existingMembers, existingPlayers, onClubUpdated, userRole }: AddPlayerModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [playerSuggestions, setPlayerSuggestions] = useState<{ _id: string; name: string; username: string }[]>([]);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setPlayerSuggestions([]);
      return;
    }
    try {
      const response = await axios.get<{ players: { _id: string; name: string; username: string }[] }>(`/api/clubs/search?query=${encodeURIComponent(query)}`);
      setPlayerSuggestions(response.data.players.filter(p => !existingMembers.some(m => m._id === p._id)));
    } catch (error) {
      toast.error('Játékosok keresése sikertelen');
    }
  };

  const handleAddMember = async (player: { _id: string; name: string }) => {
    if (!userId || userRole !== 'admin' && userRole !== 'moderator') return;
    const toastId = toast.loading('Tag hozzáadása...');
    try {
      const response = await axios.post<Club>(`/api/clubs/${clubId}/addMember`, {
        userId: player._id,
        requesterId: userId,
      });
      onClubUpdated(response.data);
      toast.success('Tag sikeresen hozzáadva!', { id: toastId });
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Tag hozzáadása sikertelen', { id: toastId });
    }
  };

  const handleAddTournamentPlayer = async () => {
    if (!userId || !searchQuery || userRole !== 'admin' && userRole !== 'moderator') return;
    if (existingPlayers.some(p => p.name.toLowerCase() === searchQuery.toLowerCase())) {
      toast.error('Ez a játékos már hozzá van adva');
      return;
    }
    const toastId = toast.loading('Játékos hozzáadása...');
    try {
      const response = await axios.post<Club>(`/api/clubs/${clubId}/addTournamentPlayer`, {
        playerName: searchQuery,
        requesterId: userId,
      });
      onClubUpdated(response.data);
      toast.success('Játékos sikeresen hozzáadva!', { id: toastId });
      setSearchQuery('');
      setPlayerSuggestions([]);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Játékos hozzáadása sikertelen', { id: toastId });
    }
  };

  return (
    <dialog open={isOpen} className="modal">
      <div className="modal-box glass-card p-8 bg-[hsl(var(--background)/0.3)] border-[hsl(var(--border)/0.5)] shadow-[0_8px_32px_rgba(0,0,0,0.2)] rounded-xl max-w-md">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-[hsl(0,80%,60%)] to-[hsl(20,80%,60%)] bg-clip-text text-transparent mb-4">
          Tag vagy Játékos Hozzáadása
        </h2>
        <div className="form-control mb-4">
          <label className="label">
            <span className="label-text text-[hsl(var(--foreground))] font-medium">Keresés (név vagy felhasználónév)</span>
          </label>
          <div className="relative">
            <IconSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[hsl(var(--muted-foreground))]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="input input-bordered w-full pl-10 bg-[hsl(var(--background)/0.5)] border-[hsl(var(--border)/0.5)] focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] transition-all duration-200"
              placeholder="Keresés név vagy felhasználónév alapján"
            />
          </div>
          {playerSuggestions.length > 0 && (
            <ul className="absolute z-10 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-md mt-1 w-full max-h-40 overflow-auto">
              {playerSuggestions.map(player => (
                <li
                  key={player._id}
                  className="p-2 hover:bg-[hsl(var(--primary)/0.2)] hover:text-[hsl(var(--primary))] cursor-pointer"
                  onClick={() => handleAddMember(player)}
                >
                  {player.name} ({player.username})
                </li>
              ))}
            </ul>
          )}
          {(userRole === 'admin' || userRole === 'moderator') && searchQuery && (
            <button
              className="btn btn-primary btn-outline btn-sm mt-4"
              onClick={handleAddTournamentPlayer}
            >
              Játékosként hozzáad: {searchQuery}
            </button>
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
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button onClick={onClose}>close</button>
      </form>
    </dialog>
  );
}