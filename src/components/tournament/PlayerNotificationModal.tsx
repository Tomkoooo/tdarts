import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import { IconX, IconMail, IconSend } from '@tabler/icons-react';

interface PlayerNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: {
    _id: string;
    playerReference: {
      _id: string;
      name: string;
      userRef?: string;
    };
  };
  tournamentName: string;
}

const PlayerNotificationModal: React.FC<PlayerNotificationModalProps> = ({
  isOpen,
  onClose,
  player,
  tournamentName
}) => {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      toast.error('Kérjük, töltse ki mindkét mezőt!');
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.post('/api/tournaments/notify-player', {
        playerId: player.playerReference._id,
        subject: subject.trim(),
        message: message.trim(),
        tournamentName
      });

      if (response.data.success) {
        toast.success('Értesítés sikeresen elküldve!');
        setSubject('');
        setMessage('');
        onClose();
      } else {
        toast.error('Hiba történt az értesítés küldése során.');
      }
    } catch (error: any) {
      console.error('Notification error:', error);
      toast.error(error.response?.data?.error || 'Hiba történt az értesítés küldése során.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setSubject('');
      setMessage('');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-base-100 rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-base-300">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <IconMail className="w-5 h-5 text-primary" />
            Értesítés küldése
          </h3>
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="btn btn-ghost btn-sm"
          >
            <IconX className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="text-sm font-medium text-base-content/70">
              Címzett: {player.playerReference.name}
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Tárgy *
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="pl. Nevezési díj befizetése"
              className="input input-bordered w-full"
              required
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Üzenet *
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Írja ide az üzenetet..."
              className="textarea textarea-bordered w-full h-32 resize-none"
              required
              disabled={isLoading}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className="btn btn-ghost flex-1"
            >
              Mégse
            </button>
            <button
              type="submit"
              disabled={isLoading || !subject.trim() || !message.trim()}
              className="btn btn-primary flex-1"
            >
              {isLoading ? (
                <span className="loading loading-spinner loading-sm"></span>
              ) : (
                <>
                  <IconSend className="w-4 h-4" />
                  Küldés
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PlayerNotificationModal;
