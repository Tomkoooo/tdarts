import React, { useState, useEffect } from 'react';
import { TournamentSettings } from '@/interface/tournament.interface';
import { IconTarget, IconExternalLink } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

interface EditTournamentModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournament: any;
  userId: string;
  onTournamentUpdated: () => void;
}

export default function EditTournamentModal({
  isOpen,
  onClose,
  tournament,
  userId,
  onTournamentUpdated
}: EditTournamentModalProps) {
  const t = useTranslations('Tournament.edit_modal');
  const tCreate = useTranslations('Tournament.create_tournament_modal.settings');
  const tCard = useTranslations('Tournament.card');
  const [settings, setSettings] = useState<TournamentSettings>(tournament.tournamentSettings);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [boards, setBoards] = useState<Array<{ 
    boardNumber: number; 
    name: string; 
    isActive: boolean; 
    status: string;
    currentMatch?: string;
    nextMatch?: string;
  }>>(tournament.boards || []);
  const [subscriptionError, setSubscriptionError] = useState<{
    currentCount: number;
    maxAllowed: number;
    planName: string;
  } | null>(null);
  const router = useRouter();

  // Reset form when tournament changes
  useEffect(() => {
    if (tournament?.tournamentSettings) {
      setSettings(tournament.tournamentSettings);
      setBoards(tournament.boards || []);
      setError('');
    }
  }, [tournament]);

  // Update boardCount when boards changes
  useEffect(() => {
    if (boards.length > 0) {
      handleSettingsChange('boardCount', boards.length);
    }
  }, [boards]);

  const handleSettingsChange = (field: keyof TournamentSettings, value: any) => {
    setSettings(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleAddBoard = () => {
    const newBoardNumber = boards.length > 0 ? Math.max(...boards.map(b => b.boardNumber)) + 1 : 1;
    setBoards(prev => [...prev, { boardNumber: newBoardNumber, name: t('board_name_placeholder', { number: newBoardNumber }), isActive: true, status: 'idle' }]);
  };

  const handleRemoveBoard = (index: number) => {
    if (boards.length > 1) {
      setBoards(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleBoardChange = (index: number, field: 'name', value: string) => {
    setBoards(prev => prev.map((board, i) => 
      i === index ? { ...board, [field]: value } : board
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate board selection
    if (!isTournamentStarted && boards.length === 0) {
      setError(t('error_min_board'));
      return;
    }
    
    setLoading(true);
    setError('');
    setSubscriptionError(null);

    try {
      // Convert empty strings to 0 for number fields
      const cleanedSettings = {
        ...settings,
        maxPlayers: typeof settings.maxPlayers === 'string' && settings.maxPlayers === '' ? 0 : settings.maxPlayers,
        startingScore: typeof settings.startingScore === 'string' && settings.startingScore === '' ? 0 : settings.startingScore,
        entryFee: typeof settings.entryFee === 'string' && settings.entryFee === '' ? 0 : settings.entryFee,
      };

      const response = await fetch(`/api/tournaments/${tournament.tournamentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          settings: cleanedSettings,
          boards: boards.map((b, idx) => ({
            boardNumber: idx + 1,
            name: b.name,
            isActive: b.isActive,
            status: b.status || 'idle',
            currentMatch: b.currentMatch,
            nextMatch: b.nextMatch
          }))
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.subscriptionError) {
          setSubscriptionError({
            currentCount: errorData.currentCount,
            maxAllowed: errorData.maxAllowed,
            planName: errorData.planName
          });
          setError(errorData.error);
        } else {
          throw new Error(errorData.error || t('status_update_err'));
        }
        return;
      }

      onTournamentUpdated();
      onClose();
    } catch (err: any) {
      setError(err.message || t('status_update_err'));
    } finally {
      setLoading(false);
    }
  };

  const isTournamentStarted = tournament?.tournamentSettings?.status !== 'pending';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl w-[95vw] max-h-[90vh] overflow-y-auto bg-card/95 backdrop-blur-md shadow-2xl border-border/40">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-primary-foreground">
            {t('title')}
          </DialogTitle>
          <DialogDescription>
            {t('description')}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="bg-destructive/15 text-destructive p-4 rounded-lg mb-4 flex items-start justify-between">
            <div className="flex-1">
              <p className="font-medium">{error}</p>
              {subscriptionError && (
                <div className="mt-2 text-sm">
                  <p>{t('plan_prefix')} <span className="font-semibold">{subscriptionError.planName}</span></p>
                  <p>{t('monthly_count')} {subscriptionError.currentCount} / {subscriptionError.maxAllowed === -1 ? t('unlimited') : subscriptionError.maxAllowed}</p>
                </div>
              )}
            </div>
            {subscriptionError && (
              <Button
                variant="destructive"
                size="sm"
                className="ml-3 gap-2"
                onClick={() => {
                  onClose();
                  router.push('/#pricing');
                }}
              >
                <IconExternalLink className="w-4 h-4" />
                {t('packages')}
              </Button>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 pt-2">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-primary">{t('basic_info')}</h3>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('name')} *</label>
              <input
                type="text"
                value={settings.name}
                onChange={(e) => handleSettingsChange('name', e.target.value)}
                className="w-full px-3 py-2 bg-muted/40 rounded-lg border border-border/40 outline-none focus:ring-2 ring-primary/20"
                placeholder="Pl.: Tavaszi Bajnokság 2024"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{t('desc')}</label>
              <textarea
                value={settings.description || ''}
                onChange={(e) => handleSettingsChange('description', e.target.value)}
                className="w-full px-3 py-2 bg-muted/40 rounded-lg border border-border/40 outline-none focus:ring-2 ring-primary/20 min-h-[80px]"
                placeholder="Részletes leírás a tornáról..."
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{t('location')}</label>
              <input
                type="text"
                value={settings.location || ''}
                onChange={(e) => handleSettingsChange('location', e.target.value)}
                className="w-full px-3 py-2 bg-muted/40 rounded-lg border border-border/40 outline-none focus:ring-2 ring-primary/20"
                placeholder="Pl.: Budapest, Sport Klub"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('start_date')} *</label>
                <input
                  type="datetime-local"
                  value={new Date(settings.startDate).toLocaleString('sv-SE', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).replace(' ', 'T')}
                  onChange={(e) => handleSettingsChange('startDate', new Date(e.target.value))}
                  className="w-full px-3 py-2 bg-muted/40 rounded-lg border border-border/40 outline-none focus:ring-2 ring-primary/20"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">{t('reg_deadline')}</label>
                <input
                  type="datetime-local"
                  value={settings.registrationDeadline ? new Date(settings.registrationDeadline).toLocaleString('sv-SE', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).replace(' ', 'T') : ''}
                  onChange={(e) => handleSettingsChange('registrationDeadline', e.target.value ? new Date(e.target.value) : undefined)}
                  className="w-full px-3 py-2 bg-muted/40 rounded-lg border border-border/40 outline-none focus:ring-2 ring-primary/20"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Tournament Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-primary">{t('tournament_settings')}</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('format')} *</label>
                <select
                  value={settings.format}
                  onChange={(e) => handleSettingsChange('format', e.target.value)}
                  className="w-full px-3 py-2 bg-muted/40 rounded-lg border border-border/40 outline-none focus:ring-2 ring-primary/20"
                  disabled={isTournamentStarted}
                  required
                >
                  <option value="group">{tCreate('format.group')}</option>
                  <option value="knockout">{tCreate('format.knockout')}</option>
                  <option value="group_knockout">{tCreate('format.group_knockout')}</option>
                </select>
                {isTournamentStarted && (
                  <p className="text-xs text-warning">Nem módosítható a verseny indítása után</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">{t('type')}</label>
                <select
                  value={settings.type}
                  onChange={(e) => handleSettingsChange('type', e.target.value)}
                  className="w-full px-3 py-2 bg-muted/40 rounded-lg border border-border/40 outline-none focus:ring-2 ring-primary/20"
                >
                  <option value="amateur">{tCard('type.amateur')}</option>
                  <option value="open">{tCard('type.open')}</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">{t('max_players')} *</label>
                <input
                  type="number"
                  value={settings.maxPlayers ?? ''}
                  onChange={(e) => handleSettingsChange('maxPlayers', e.target.value === '' ? '' : parseInt(e.target.value))}
                  className="w-full px-3 py-2 bg-muted/40 rounded-lg border border-border/40 outline-none focus:ring-2 ring-primary/20"
                  min="0"
                  disabled={isTournamentStarted}
                  required
                />
                {isTournamentStarted && (
                  <p className="text-xs text-warning">{t('status_warning')}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">{t('starting_score')} *</label>
                <input
                  type="number"
                  value={settings.startingScore ?? ''}
                  onChange={(e) => handleSettingsChange('startingScore', e.target.value === '' ? '' : parseInt(e.target.value))}
                  className="w-full px-3 py-2 bg-muted/40 rounded-lg border border-border/40 outline-none focus:ring-2 ring-primary/20"
                  min="0"
                  disabled={isTournamentStarted}
                  required
                />
                {isTournamentStarted && (
                  <p className="text-xs text-warning">{t('status_warning')}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">{t('board_count')}</label>
                <div className="w-full px-3 py-2 bg-muted/20 text-muted-foreground rounded-lg border border-border/20">
                  {t('boards_summary', { count: boards.length })}
                </div>
                <p className="text-xs text-muted-foreground">{t('boards_summary_desc', { defaultValue: 'Automatikusan frissül a táblák alapján' })}</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">{t('entry_fee')}</label>
                <input
                  type="number"
                  value={settings.entryFee ?? ''}
                  onChange={(e) => handleSettingsChange('entryFee', e.target.value === '' ? '' : parseInt(e.target.value))}
                  className="w-full px-3 py-2 bg-muted/40 rounded-lg border border-border/40 outline-none focus:ring-2 ring-primary/20"
                  min="0"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{t('password')}</label>
              <input
                type="text"
                value={settings.tournamentPassword}
                onChange={(e) => handleSettingsChange('tournamentPassword', e.target.value)}
                className="w-full px-3 py-2 bg-muted/40 rounded-lg border border-border/40 outline-none focus:ring-2 ring-primary/20"
                placeholder={t('password_placeholder')}
              />
            </div>

            {settings.format === 'group_knockout' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('knockout_method')}</label>
                <select
                  value={settings.knockoutMethod || 'automatic'}
                  onChange={(e) => handleSettingsChange('knockoutMethod', e.target.value)}
                  className="w-full px-3 py-2 bg-muted/40 rounded-lg border border-border/40 outline-none focus:ring-2 ring-primary/20"
                >
                  <option value="automatic">{t('auto')}</option>
                  <option value="manual">{t('manual')}</option>
                </select>
              </div>
            )}
          </div>

          {/* Board Management - Only show if tournament hasn't started */}
          {!isTournamentStarted && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-primary">{t('board_management')}</h3>
              
              <div className="space-y-3">
                {boards.map((board, index) => (
                  <div key={index} className="flex gap-2 items-center p-3 bg-muted/20 rounded-lg border border-border/20">
                    <div className="flex items-center gap-2 px-2">
                      <IconTarget className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium whitespace-nowrap">#{index + 1}</span>
                    </div>
                    <input
                      type="text"
                      value={board.name}
                      onChange={(e) => handleBoardChange(index, 'name', e.target.value)}
                      className="flex-1 px-3 py-1.5 bg-background/50 rounded-md border border-border/40 outline-none focus:ring-1 ring-primary/30 text-sm"
                      placeholder={t('board_name_placeholder', { number: index + 1 })}
                    />
                    {boards.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveBoard(index)}
                        className="h-8 w-8 text-destructive hover:bg-destructive/10"
                      >
                        ✕
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddBoard}
                  className="w-full border-dashed"
                >
                  + {t('add_board')}
                </Button>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              {t('cancel')}
            </Button>
            <Button
              type="submit"
              disabled={loading || (boards.length === 0 && !isTournamentStarted)}
            >
              {loading ? t('saving') : t('save')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
