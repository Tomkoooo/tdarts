import { useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import { Club } from '@/interface/club.interface';

interface TournamentPlayerListProps {
  players: { name: string }[];
  userRole: 'admin' | 'moderator' | 'member' | 'none';
  userId?: string;
  clubId: string;
  onAddPlayer: () => void;
  onClubUpdated: (club: Club) => void;
}

export default function TournamentPlayerList({ players, userRole, userId, clubId, onAddPlayer, onClubUpdated }: TournamentPlayerListProps) {
  const handleRemovePlayer = async (playerName: string) => {
    if (!userId) return;
    const toastId = toast.loading('Játékos törlése...');
    try {
      const response = await axios.post<Club>(`/api/clubs/${clubId}/removeTournamentPlayer`, {
        playerName,
        requesterId: userId,
      });
      onClubUpdated(response.data);
      toast.success(`${playerName} törölve!`, { id: toastId });
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Játékos törlése sikertelen', { id: toastId });
    }
  };

  return (
    <div className="glass-card p-8 bg-[hsl(var(--background)/0.3)] border-[hsl(var(--border)/0.5)] shadow-[0_8px_32px_rgba(0,0,0,0.2)] rounded-xl">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-primary">
          Tornajátékosok
        </h2>
        {(userRole === 'admin' || userRole === 'moderator') && (
          <button
            className="btn btn-primary btn-outline btn-sm"
            onClick={onAddPlayer}
          >
            <IconPlus className="w-5 h-5" />
            Játékos Hozzáadása
          </button>
        )}
      </div>
      {players && players.length === 0 ? (
        <p className="text-[hsl(var(--muted-foreground))]">Nincsenek tornajátékosok.</p>
      ) : (
        <ul className="space-y-2">
          {players?.map(player => (
            <li
              key={player.name}
              className="flex justify-between items-center p-2 bg-[hsl(var(--background)/0.5)] rounded-md hover:bg-[hsl(var(--secondary)/0.1)] transition-all duration-200"
            >
              <span className="badge badge-secondary badge-lg">{player.name}</span>
              {(userRole === 'admin' || userRole === 'moderator') && (
                <button
                  className="glass-button btn btn-xs btn-error hover:scale-105 transition-all duration-300"
                  onClick={() => handleRemovePlayer(player.name)}
                >
                  <IconTrash className="w-4 h-4" />
                  Törlés
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}