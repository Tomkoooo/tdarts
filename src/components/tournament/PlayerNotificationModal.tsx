import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import { IconX, IconMail, IconSend, IconEye, IconEyeOff } from '@tabler/icons-react';

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
  const [language, setLanguage] = useState<'hu' | 'en'>('hu');
  const [showPreview, setShowPreview] = useState(false);
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
        language,
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
      setLanguage('hu');
      setShowPreview(false);
      onClose();
    }
  };

  const generateEmailPreview = () => {
    const isHungarian = language === 'hu';
    
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #b62441 0%, #8a1b31 100%); color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px; font-weight: bold;">
            ${isHungarian ? 'tDarts - Verseny Értesítés' : 'tDarts - Tournament Notification'}
          </h1>
        </div>
        
        <!-- Content -->
        <div style="padding: 30px;">
          
          ${isHungarian ? `
            <h2 style="color: #b62441; font-size: 20px; margin-bottom: 16px;">Kedves ${player.playerReference.name}!</h2>
            <p style="color: #374151; line-height: 1.6; margin-bottom: 16px;">
              A ${tournamentName} verseny kapcsán szeretnénk értesíteni Önt a következőről:
            </p>
            <div style="background: #f9fafb; border-left: 4px solid #b62441; padding: 16px; margin: 20px 0;">
              <h3 style="color: #b62441; margin: 0 0 8px 0; font-size: 16px;">${subject}</h3>
              <p style="color: #374151; margin: 0; white-space: pre-line;">${message}</p>
            </div>
            <p style="color: #374151; line-height: 1.6; margin-bottom: 16px;">
              Ha bármilyen kérdése van, kérjük, lépjen kapcsolatba velünk.
            </p>
            <p style="color: #374151; line-height: 1.6;">
              Üdvözlettel,<br>
              A tDarts csapat
            </p>
          ` : `
            <h2 style="color: #b62441; font-size: 20px; margin-bottom: 16px;">Dear ${player.playerReference.name}!</h2>
            <p style="color: #374151; line-height: 1.6; margin-bottom: 16px;">
              Regarding the ${tournamentName} tournament, we would like to inform you about the following:
            </p>
            <div style="background: #f9fafb; border-left: 4px solid #b62441; padding: 16px; margin: 20px 0;">
              <h3 style="color: #b62441; margin: 0 0 8px 0; font-size: 16px;">${subject}</h3>
              <p style="color: #374151; margin: 0; white-space: pre-line;">${message}</p>
            </div>
            <p style="color: #374151; line-height: 1.6; margin-bottom: 16px;">
              If you have any questions, please contact us.
            </p>
            <p style="color: #374151; line-height: 1.6;">
              Best regards,<br>
              The tDarts team
            </p>
          `}
        </div>
        
        <!-- Footer -->
        <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 12px; margin: 0;">
            © 2024 tDarts. Minden jog fenntartva.
          </p>
        </div>
      </div>
    `;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-base-100 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
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

        <div className="p-4">
          {!showPreview ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-base-content/70">
                  Címzett: {player.playerReference.name}
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Email nyelv *
                  </label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value as 'hu' | 'en')}
                    className="select select-bordered w-full"
                    disabled={isLoading}
                  >
                    <option value="hu">Magyar (alapértelmezett)</option>
                    <option value="en">English</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Verseny neve
                  </label>
                  <input
                    type="text"
                    value={tournamentName}
                    className="input input-bordered w-full"
                    disabled
                  />
                </div>
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

              <div className="flex flex-col sm:flex-row gap-2 pt-4">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isLoading}
                  className="btn btn-ghost flex-1"
                >
                  Mégse
                </button>
                <button
                  type="button"
                  onClick={() => setShowPreview(true)}
                  disabled={isLoading || !subject.trim() || !message.trim()}
                  className="btn btn-info flex-1"
                >
                  <IconEye className="w-4 h-4" />
                  Előnézet
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
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-semibold">Email előnézet</h4>
                <button
                  onClick={() => setShowPreview(false)}
                  className="btn btn-ghost btn-sm"
                >
                  <IconEyeOff className="w-4 h-4" />
                  Szerkesztés
                </button>
              </div>
              
              <div className="border border-base-300 rounded-lg overflow-hidden">
                <div className="bg-base-200 p-3 border-b border-base-300">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium">Nyelv:</span>
                    <span className="badge badge-primary">
                      {language === 'hu' ? 'Magyar' : 'English'}
                    </span>
                    <span className="font-medium ml-4">Címzett:</span>
                    <span>{player.playerReference.name}</span>
                  </div>
                </div>
                <div className="p-4 bg-base-100 max-h-96 overflow-y-auto">
                  <div 
                    dangerouslySetInnerHTML={{ __html: generateEmailPreview() }}
                    className="email-preview"
                  />
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-2 pt-4">
                <button
                  onClick={() => setShowPreview(false)}
                  className="btn btn-ghost flex-1"
                >
                  Szerkesztés
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isLoading}
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlayerNotificationModal;
