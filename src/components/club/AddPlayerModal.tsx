import React, { useState } from 'react';
import { IconX } from '@tabler/icons-react';
import PlayerSearch from './PlayerSearch';

interface AddPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  clubId: string;
  userId?: string;
  userRole: 'admin' | 'moderator' | 'member' | 'none';
  onPlayerAdded: () => void;
}

export default function AddPlayerModal({
  isOpen,
  onClose,
  clubId,
  userId,
  onPlayerAdded
}: AddPlayerModalProps) {
  const [selectedPlayer, setSelectedPlayer] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  if (!isOpen) return null;

  const handlePlayerSelected = (player: any) => {
    setSelectedPlayer(player);
  };

  const handleAdd = async () => {
    if (!selectedPlayer) return;
    setLoading(true);
    try {
      await fetch(`/api/clubs/${clubId}/addMember`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedPlayer._id,
          requesterId: userId,
          isGuest: selectedPlayer.isGuest,
          name: selectedPlayer.name
        }),
      });
      onPlayerAdded();
      onClose();
    } catch (error) {
      console.error('Hiba a játékos hozzáadása során:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      {/* Modal */}
      <div className="relative bg-base-200 rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-base-300">
          <h2 className="text-xl font-semibold">Játékos hozzáadása</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-base-100 rounded-lg transition-colors"
          >
            <IconX size={20} />
          </button>
        </div>
        {/* Content */}
        <div className="p-4 space-y-4">
          <PlayerSearch
            onPlayerSelected={handlePlayerSelected}
            placeholder="Keress játékost név vagy felhasználónév alapján..."
            className="w-full"
            clubId={clubId}
            isForTournament={false}
          />
          {selectedPlayer && (
            <div className="bg-base-100 rounded-lg p-3 flex items-center gap-3 shadow">
              <span className="badge badge-neutral">{selectedPlayer.isGuest ? 'Vendég' : 'Regisztrált'}</span>
              <span className="font-semibold text-base-content">{selectedPlayer.name}</span>
            </div>
          )}
        </div>
        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t border-base-300 bg-base-100">
          <button
            onClick={onClose}
            className="btn btn-ghost btn-sm"
            type="button"
          >
            Mégse
          </button>
          <button
            onClick={handleAdd}
            className="btn btn-primary btn-sm"
            disabled={!selectedPlayer || loading}
            type="button"
          >
            Hozzáadás
          </button>
        </div>
      </div>
    </div>
  );
}