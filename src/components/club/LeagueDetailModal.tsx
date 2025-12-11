'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  IconArrowRight,
  IconEdit,
  IconInfoCircle,
  IconShare,
  IconTrash,
  IconTrophy,
  IconUser,
  IconUsers,
} from '@tabler/icons-react';
import PlayerSearch from './PlayerSearch';
import TournamentCard from '../tournament/TournamentCard';
import {
  League,
  LeagueLeaderboard,
  LeagueStatsResponse,
} from '@/interface/league.interface';
import { showErrorToast, showSuccessToast } from '@/lib/toastUtils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from "@/components/ui/Input";
import { Label } from '@/components/ui/Label';
;

interface LeagueDetailModalProps {
  league: League;
  clubId: string;
  userRole: 'admin' | 'moderator' | 'member' | 'none';
  isOpen: boolean;
  onClose: () => void;
  onLeagueUpdated: () => void;
  readOnly?: boolean;
}

type TabType = 'leaderboard' | 'tournaments' | 'settings';

export default function LeagueDetailModal({
  league,
  clubId,
  userRole,
  isOpen,
  onClose,
  onLeagueUpdated,
  readOnly = false,
}: LeagueDetailModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('leaderboard');
  const [leagueStats, setLeagueStats] = useState<LeagueStatsResponse | null>(null);
  const [loading, setLoading] = useState(false);

  // ... (comments) ...
  
  const isVerifiedLeague = league.verified;
  const canManage = !readOnly && !isVerifiedLeague && (userRole === 'admin' || userRole === 'moderator');
  
  // Note: If the user IS a global admin, they should be able to manage.
  // However, the current props don't pass 'isGlobalAdmin'. 
  // We might need to update the parent component or fetch this info.
  // For now, we strictly follow "club admin cannot modify verified leagues".
  // If the current user IS global admin, they likely access this via a different view or we need to update props.
  // Assuming the user wants to restrict CLUB admins.

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/clubs/${clubId}?page=leagues&league=${league._id}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: `${league.name} - Liga`,
          text: `Nézd meg ezt a ligát: ${league.name}`,
          url: shareUrl,
        });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        showSuccessToast('Liga link másolva a vágólapra!');
      }
    } catch (err) {
      console.error('Error sharing league:', err);
      try {
        await navigator.clipboard.writeText(shareUrl);
        showSuccessToast('Liga link másolva a vágólapra!');
      } catch {
        showErrorToast('Nem sikerült másolni a linket');
      }
    }
  };

  useEffect(() => {
    if (isOpen && league._id) {
      fetchLeagueStats();
    }
  }, [isOpen, league._id]);

  const fetchLeagueStats = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/clubs/${clubId}/leagues/${league._id}`);
      if (response.ok) {
        const data = await response.json();
        setLeagueStats(data);
      } else {
        console.error('Failed to load league details');
      }
    } catch (err) {
      console.error('Error fetching league stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleManualPointsAdjustment = async (playerId: string, points: number, reason: string) => {
    try {
      const response = await fetch(`/api/clubs/${clubId}/leagues/${league._id}/adjust-points`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId,
          pointsAdjustment: points,
          reason,
        }),
      });

      if (response.ok) {
        fetchLeagueStats();
      } else {
        const errorData = await response.json();
        showErrorToast(errorData.error || 'Hiba a pontszám módosítása során', {
          context: 'Liga pontszám módosítása',
          error: errorData.error,
        });
      }
    } catch (err) {
      showErrorToast('Hiba a pontszám módosítása során', {
        context: 'Liga pontszám módosítása',
        error: err instanceof Error ? err.message : 'Ismeretlen hiba',
      });
      console.error('Error adjusting points:', err);
    }
  };

  const handleAddPlayerToLeague = async (player: any) => {
    try {
      let playerId = player._id;
      const playerName = player.name;

      if (!playerId) {
        const createResponse = await fetch('/api/players', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: playerName }),
        });

        if (!createResponse.ok) {
          const errorData = await createResponse.json();
          showErrorToast(errorData.error || 'Hiba a játékos létrehozása során', {
            context: 'Liga játékos létrehozása',
            error: errorData.error,
          });
          return;
        }

        const createData = await createResponse.json();
        playerId = createData._id;
      }

      const response = await fetch(`/api/clubs/${clubId}/leagues/${league._id}/players`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId, playerName }),
      });

      if (response.ok) {
        fetchLeagueStats();
        showSuccessToast('Játékos sikeresen hozzáadva a ligához!');
      } else {
        const errorData = await response.json();
        showErrorToast(errorData.error || 'Hiba a játékos hozzáadása során', {
          context: 'Liga játékos hozzáadása',
          error: errorData.error,
        });
      }
    } catch (error) {
      showErrorToast('Hiba a játékos hozzáadása során', {
        context: 'Liga játékos hozzáadása',
        error: error instanceof Error ? error.message : 'Ismeretlen hiba',
      });
    }
  };

  const handleRemovePlayerFromLeague = async (playerId: string, playerName: string, reason: string) => {
    try {
      const response = await fetch(`/api/clubs/${clubId}/leagues/${league._id}/players/${playerId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });

      if (response.ok) {
        fetchLeagueStats();
        showSuccessToast(`${playerName} sikeresen eltávolítva a ligából!`);
      } else {
        const errorData = await response.json();
        showErrorToast(errorData.error || 'Hiba a játékos eltávolítása során', {
          context: 'Liga játékos eltávolítása',
          error: errorData.error,
        });
      }
    } catch (error) {
      showErrorToast('Hiba a játékos eltávolítása során', {
        context: 'Liga játékos eltávolítása',
        error: error instanceof Error ? error.message : 'Ismeretlen hiba',
      });
    }
  };

  const stats = useMemo(() => {
    return {
      totalPlayers: leagueStats?.totalPlayers ?? 0,
      totalTournaments: leagueStats?.totalTournaments ?? 0,
      averagePoints:
        typeof leagueStats?.averagePointsPerTournament === 'number'
          ? leagueStats?.averagePointsPerTournament.toFixed(1)
          : '0.0',
    };
  }, [leagueStats]);

  const handleClose = (open: boolean) => {
    if (!open) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden px-0 py-0 flex flex-col">
        <div className="flex h-full flex-col overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 flex-shrink-0">
            <div className="flex items-start justify-between gap-4">
              <div>
                <DialogTitle className="text-2xl font-semibold text-foreground flex items-center gap-2">
                  {league.name}
                  {!league.isActive && (
                    <Badge variant="secondary" className="text-xs">Lezárt</Badge>
                  )}
                </DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground">
                  Kezeld a liga ranglistáját, csatolt versenyeket és beállításokat.
                </DialogDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={handleShare}>
                  <IconShare className="h-4 w-4" />
                </Button>
                <div className="w-8"></div>
              </div>
            </div>
          </DialogHeader>

          <div className="px-6">
            <StatsOverview stats={stats} isLoading={loading} />
          </div>

          <div className="mt-4 flex flex-1 flex-col overflow-hidden px-6 pb-6">
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabType)} className="flex h-full flex-col overflow-hidden">
              <TabsList className="grid w-full grid-cols-3 flex-shrink-0">
                <TabsTrigger value="leaderboard">Ranglista</TabsTrigger>
                <TabsTrigger value="tournaments">Versenyek</TabsTrigger>
                <TabsTrigger value="settings" disabled={!canManage}>
                  Beállítások
                </TabsTrigger>
              </TabsList>

              <TabsContent value="leaderboard" className="mt-4 flex-1 overflow-y-auto min-h-0">
                <LeaderboardTab
                  league={league}
                  leaderboard={leagueStats?.leaderboard || []}
                  canManage={canManage}
                  onAdjustPoints={handleManualPointsAdjustment}
                  onAddPlayer={handleAddPlayerToLeague}
                  onRemovePlayer={handleRemovePlayerFromLeague}
                  isLoading={loading}
                />
              </TabsContent>

              <TabsContent value="tournaments" className="mt-4 flex-1 overflow-y-auto min-h-0">
                <TournamentsTab
                  tournaments={leagueStats?.league?.attachedTournaments || []}
                  canManage={canManage}
                  clubId={clubId}
                  leagueId={league._id!}
                  onTournamentAttached={fetchLeagueStats}
                  pointSystemType={league.pointSystemType || 'platform'}
                />
              </TabsContent>

              <TabsContent value="settings" className="mt-4 flex-1 overflow-y-auto min-h-0">
                <SettingsTab
                  league={league}
                  clubId={clubId}
                  onLeagueUpdated={() => {
                    onLeagueUpdated();
                    fetchLeagueStats();
                  }}
                  leagueStats={leagueStats}
                  disabled={!canManage}
                />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const StatsOverview = ({
  stats,
  isLoading,
}: {
  stats: { totalPlayers: number; totalTournaments: number; averagePoints: string };
  isLoading: boolean;
}) => {
  const items = [
    {
      icon: <IconUsers className="h-5 w-5" />,
      label: 'Játékosok',
      value: stats.totalPlayers,
    },
    {
      icon: <IconTrophy className="h-5 w-5" />,
      label: 'Csatlakoztatott versenyek',
      value: stats.totalTournaments,
    },
    {
      icon: <IconArrowRight className="h-5 w-5" />,
      label: 'Átlag pont / verseny',
      value: stats.averagePoints,
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {items.map((item, index) => (
        <Card key={index} className="border-none bg-card/60">
          <CardContent className="flex items-center gap-3 py-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              {item.icon}
            </span>
            <div>
              <p className="text-sm text-muted-foreground">{item.label}</p>
              <p className="text-xl font-semibold text-foreground">
                {isLoading ? '...' : item.value}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

interface LeaderboardTabProps {
  leaderboard: LeagueLeaderboard[];
  canManage: boolean;
  onAdjustPoints: (playerId: string, points: number, reason: string) => void;
  onAddPlayer: (player: any) => void;
  onRemovePlayer: (playerId: string, playerName: string, reason: string) => void;
  league: League;
  isLoading: boolean;
}

function LeaderboardTab({
  leaderboard,
  canManage,
  onAdjustPoints,
  onAddPlayer,
  onRemovePlayer,
  league,
  isLoading,
}: LeaderboardTabProps) {
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [adjustDialog, setAdjustDialog] = useState<{
    open: boolean;
    mode: 'adjust' | 'set';
    player?: { id: string; name: string; currentPoints: number };
  }>({ open: false, mode: 'adjust' });
  const [removeDialog, setRemoveDialog] = useState<{
    open: boolean;
    player?: { id: string; name: string; currentPoints: number };
  }>({ open: false });
  const [adjustPoints, setAdjustPoints] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [removeReason, setRemoveReason] = useState('');

  const handleOpenAdjust = (playerId: string, playerName: string, currentPoints: number) => {
    setAdjustDialog({
      open: true,
      mode: 'adjust',
      player: { id: playerId, name: playerName, currentPoints },
    });
    setAdjustPoints('');
    setAdjustReason('');
  };

  const handleSubmitAdjust = () => {
    if (!adjustDialog.player) return;
    const rawValue = adjustPoints.trim();
    if (!rawValue) {
      showErrorToast('Kérlek adj meg egy pontszámot!', {
        context: 'Liga pontszám módosítása',
        reportable: false,
      });
      return;
    }

    const parsedValue = parseInt(rawValue, 10);
    if (Number.isNaN(parsedValue)) {
      showErrorToast('Érvénytelen pontszám formátum', {
        context: 'Liga pontszám módosítása',
        reportable: false,
      });
      return;
    }

    if (!adjustReason.trim()) {
      showErrorToast('Kérlek add meg az okot!', {
        context: 'Liga pontszám módosítása',
        reportable: false,
      });
      return;
    }

    let pointsToAdjust = parsedValue;
    if (adjustDialog.mode === 'set') {
      pointsToAdjust = parsedValue - (adjustDialog.player?.currentPoints ?? 0);
      if (pointsToAdjust === 0) {
        showErrorToast('Az új pontszám megegyezik a jelenlegivel!', {
          context: 'Liga pontszám módosítása',
          reportable: false,
        });
        return;
      }
    } else if (pointsToAdjust === 0) {
      showErrorToast('A pontszám változás nem lehet 0!', {
        context: 'Liga pontszám módosítása',
        reportable: false,
      });
      return;
    }

    onAdjustPoints(adjustDialog.player.id, pointsToAdjust, adjustReason);
    setAdjustDialog({ open: false, mode: 'adjust' });
    setAdjustPoints('');
    setAdjustReason('');
    showSuccessToast('Pontszám sikeresen módosítva!');
  };

  const handleSubmitRemove = () => {
    if (!removeDialog.player) return;
    if (!removeReason.trim()) {
      showErrorToast('Kérlek add meg az eltávolítás okát!', {
        context: 'Liga játékos eltávolítása',
        reportable: false,
      });
      return;
    }

    onRemovePlayer(removeDialog.player.id, removeDialog.player.name, removeReason);
    setRemoveDialog({ open: false });
    setRemoveReason('');
  };

  return (
    <div className="space-y-4">
      {league.description && (
        <Card className="border-none bg-card/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Liga leírása</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              {descriptionExpanded || league.description.length <= 160
                ? league.description
                : `${league.description.slice(0, 160)}...`}
            </p>
            {league.description.length > 160 && (
              <Button
                variant="ghost"
                size="sm"
                className="px-0"
                onClick={() => setDescriptionExpanded((prev) => !prev)}
              >
                {descriptionExpanded ? 'Kevesebb' : 'Bővebben'}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {canManage && (
        <Card className="border-dashed bg-card/40">
          <CardContent className="space-y-4 py-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-foreground">Játékos hozzáadása a ligához</h4>
            </div>
            <PlayerSearch
              onPlayerSelected={onAddPlayer}
              placeholder="Játékos keresése és hozzáadása..."
              clubId=""
              isForTournament={false}
            />
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
        </div>
      ) : leaderboard.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center space-y-2">
            <p className="text-sm text-muted-foreground">Még nincsenek játékosok a ranglistán</p>
            {canManage && (
              <p className="text-xs text-muted-foreground/80">
                Használd a fenti keresőt játékosok hozzáadásához.
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="border-none bg-card/60">
          <CardContent className="px-0">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-muted/20 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 text-left">#</th>
                    <th className="px-4 py-3 text-left">Játékos</th>
                    <th className="px-4 py-3 text-right">Pont</th>
                    <th className="px-4 py-3 text-right hidden sm:table-cell">Versenyek</th>
                    <th className="px-4 py-3 text-right hidden md:table-cell">Átlag hely</th>
                    <th className="px-4 py-3 text-right hidden md:table-cell">Legjobb</th>
                    <th className="px-4 py-3 text-right hidden lg:table-cell">Dobás átlag</th>
                    {canManage && <th className="px-4 py-3 text-right">Műveletek</th>}
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((entry) => (
                    <tr key={entry.player._id} className="hover:bg-muted/10 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-sm font-semibold">
                          <span>{entry.position}</span>
                          {entry.position <= 3 && (
                            <span>
                              {entry.position === 1 ? '🥇' : entry.position === 2 ? '🥈' : '🥉'}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="max-w-[180px] truncate font-medium" title={entry.player.name}>
                          {entry.player.name}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-mono font-semibold text-primary">{entry.totalPoints}</span>
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground hidden sm:table-cell">
                        {entry.tournamentsPlayed}
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground hidden md:table-cell">
                        {entry.averagePosition > 0 ? entry.averagePosition.toFixed(1) : '–'}
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground hidden md:table-cell">
                        {entry.bestPosition > 0 ? entry.bestPosition : '–'}
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground hidden lg:table-cell">
                        {entry.leagueAverage && entry.leagueAverage > 0
                          ? entry.leagueAverage.toFixed(2)
                          : '–'}
                      </td>
                      {canManage && (
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                handleOpenAdjust(entry.player._id, entry.player.name, entry.totalPoints)
                              }
                            >
                              <IconEdit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive"
                              onClick={() =>
                                setRemoveDialog({
                                  open: true,
                                  player: {
                                    id: entry.player._id,
                                    name: entry.player.name,
                                    currentPoints: entry.totalPoints,
                                  },
                                })
                              }
                            >
                              <IconTrash className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog
        open={adjustDialog.open && !!adjustDialog.player}
        onOpenChange={(open) => !open && setAdjustDialog({ open: false, mode: 'adjust' })}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Pontszám módosítása</DialogTitle>
            <DialogDescription>
              {adjustDialog.player?.name} jelenlegi pontszáma:{' '}
              <span className="font-mono font-semibold text-primary">
                {adjustDialog.player?.currentPoints}
              </span>
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-2">
            <Button
              variant={adjustDialog.mode === 'adjust' ? 'default' : 'outline'}
              className="flex-1"
              onClick={() => {
                setAdjustDialog((prev) => ({ ...prev, mode: 'adjust' }));
                setAdjustPoints('');
              }}
            >
              Módosítás (±)
            </Button>
            <Button
              variant={adjustDialog.mode === 'set' ? 'default' : 'outline'}
              className="flex-1"
              onClick={() => {
                setAdjustDialog((prev) => ({ ...prev, mode: 'set' }));
                setAdjustPoints('');
              }}
            >
              Beállítás (=)
            </Button>
          </div>

          <div className="space-y-2">
            <Label>{adjustDialog.mode === 'adjust' ? 'Pontszám változás' : 'Új pontszám'}</Label>
            <Input
              value={adjustPoints}
              onChange={(event) => {
                const value = event.target.value;
                const pattern = adjustDialog.mode === 'adjust' ? /^-?\d*$/ : /^\d*$/;
                if (value === '' || pattern.test(value)) {
                  setAdjustPoints(value);
                }
              }}
              placeholder={adjustDialog.mode === 'adjust' ? 'pl.: +10 vagy -5' : 'pl.: 100'}
            />
            <p className="text-xs text-muted-foreground">
              {adjustDialog.mode === 'adjust'
                ? 'Add meg, mennyi pontot adjunk hozzá vagy vonjunk le.'
                : 'Állítsd be a játékos új összpontszámát.'}
            </p>
          </div>

          <div className="space-y-2">
            <Label>Indoklás</Label>
            <textarea
              className="min-h-[80px] w-full rounded-md bg-background px-3 py-2 text-sm outline-none shadow-sm shadow-black/10 focus-visible:ring-2 focus-visible:ring-primary/20"
              value={adjustReason}
              onChange={(event) => setAdjustReason(event.target.value)}
              placeholder="Miért módosítod a pontokat?"
            />
          </div>

          <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="ghost" onClick={() => setAdjustDialog({ open: false, mode: 'adjust' })}>
              Mégse
            </Button>
            <Button onClick={handleSubmitAdjust}>Mentés</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={removeDialog.open && !!removeDialog.player}
        onOpenChange={(open) => !open && setRemoveDialog({ open: false })}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive">Játékos eltávolítása</DialogTitle>
            <DialogDescription>
              {removeDialog.player?.name} jelenlegi pontszáma:{' '}
              <span className="font-mono font-semibold text-primary">
                {removeDialog.player?.currentPoints}
              </span>
            </DialogDescription>
          </DialogHeader>

          <Alert className="border-destructive/40 bg-destructive/10">
            <AlertDescription>
              Ez a művelet eltávolítja a játékost a ranglistáról, de a történetben visszavonható lesz.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label>Eltávolítás oka</Label>
            <textarea
              className="min-h-[80px] w-full rounded-md bg-background px-3 py-2 text-sm outline-none shadow-sm shadow-black/10 focus-visible:ring-2 focus-visible:ring-primary/20"
              value={removeReason}
              onChange={(event) => setRemoveReason(event.target.value)}
              placeholder="Miért távolítod el a játékost?"
            />
          </div>

          <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="ghost" onClick={() => setRemoveDialog({ open: false })}>
              Mégse
            </Button>
            <Button variant="destructive" onClick={handleSubmitRemove}>
              Eltávolítás
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface TournamentsTabProps {
  tournaments: any[];
  canManage: boolean;
  clubId: string;
  leagueId: string;
  onTournamentAttached: () => void;
  pointSystemType?: 'platform' | 'remiz_christmas';
}

function TournamentsTab({ tournaments, canManage, clubId, leagueId, onTournamentAttached, pointSystemType = 'platform' }: TournamentsTabProps) {
  const [showAttachModal, setShowAttachModal] = useState(false);
  const [showDetachModal, setShowDetachModal] = useState(false);
  const [availableTournaments, setAvailableTournaments] = useState<any[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState('');
  const [tournamentToDetach, setTournamentToDetach] = useState<{ id: string; name: string } | null>(null);
  const [calculatePoints, setCalculatePoints] = useState(false);
  const [loading, setLoading] = useState(false);

  const validTournaments = useMemo(
    () =>
      tournaments.filter(
        (tournament: any) =>
          tournament && tournament._id && (tournament.tournamentSettings || tournament.name),
      ),
    [tournaments],
  );

  const fetchAvailableTournaments = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/clubs/${clubId}/tournaments`);
      if (response.ok) {
        const data = await response.json();
        const attachedIds = tournaments.map((t) => t._id);
        const available = data.tournaments.filter(
          (t: any) => !attachedIds.includes(t._id) && t.tournamentSettings.status === 'finished',
        );
        setAvailableTournaments(available);
      }
    } catch (error) {
      showErrorToast('Nem sikerült betölteni a versenyeket', {
        context: 'Verseny betöltése',
        error: error instanceof Error ? error.message : 'Ismeretlen hiba',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAttachTournament = async () => {
    if (!selectedTournamentId) {
      showErrorToast('Kérlek válassz egy versenyt!', {
        context: 'Verseny hozzárendelése',
        reportable: false,
      });
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/clubs/${clubId}/leagues/${leagueId}/attach-tournament`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tournamentId: selectedTournamentId, calculatePoints }),
      });

      if (response.ok) {
        showSuccessToast(
          calculatePoints
            ? 'Verseny sikeresen hozzárendelve pontszámítással!'
            : 'Verseny sikeresen hozzárendelve (csak átlagok, pontszámítás nélkül)!',
        );
        setShowAttachModal(false);
        setSelectedTournamentId('');
        setCalculatePoints(false);
        onTournamentAttached();
      } else {
        const errorData = await response.json();
        showErrorToast(errorData.error || 'Hiba a verseny hozzárendelése során', {
          context: 'Verseny hozzárendelése',
          error: errorData.error,
        });
      }
    } catch (error) {
      showErrorToast('Hiba a verseny hozzárendelése során', {
        context: 'Verseny hozzárendelése',
        error: error instanceof Error ? error.message : 'Ismeretlen hiba',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDetachTournament = async () => {
    if (!tournamentToDetach) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/clubs/${clubId}/leagues/${leagueId}/detach-tournament`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tournamentId: tournamentToDetach.id }),
      });

      if (response.ok) {
        showSuccessToast('Verseny sikeresen eltávolítva a ligából és az automatikus pontok visszavonva!');
        setShowDetachModal(false);
        setTournamentToDetach(null);
        onTournamentAttached();
      } else {
        const errorData = await response.json();
        showErrorToast(errorData.error || 'Hiba a verseny eltávolítása során', {
          context: 'Verseny eltávolítása',
          error: errorData.error,
        });
      }
    } catch (error) {
      showErrorToast('Hiba a verseny eltávolítása során', {
        context: 'Verseny eltávolítása',
        error: error instanceof Error ? error.message : 'Ismeretlen hiba',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="flex justify-end">
          <Button
            onClick={() => {
              fetchAvailableTournaments();
              setShowAttachModal(true);
            }}
            className="gap-2"
          >
            <IconTrophy className="h-4 w-4" />
            Befejezett verseny hozzárendelése
          </Button>
        </div>
      )}

      {validTournaments.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center space-y-3">
            <div className="text-4xl">🏆</div>
            <p className="text-sm text-muted-foreground">Ehhez a ligához még nem lettek versenyek csatolva.</p>
            {canManage && (
              <div className="rounded-lg bg-muted/30 px-4 py-3 text-left text-xs text-muted-foreground shadow-sm shadow-black/5">
                <p className="font-semibold text-foreground">Versenyek hozzáadása:</p>
                <ul className="mt-1 space-y-1">
                  <li>• Új verseny létrehozásakor válaszd ki ezt a ligát (automatikus pontszámítás).</li>
                  <li>• Már befejezett versenyeknél a fenti gombbal adhatod hozzá (csak átlagok).</li>
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {validTournaments.map((tournament: any) => (
            <Card key={tournament._id} className="border-none bg-card/60">
              <CardContent className="space-y-3">
                <TournamentCard
                  tournament={{
                    _id: tournament._id,
                    tournamentId: tournament.tournamentId || tournament._id,
                    tournamentSettings: {
                      name: tournament.tournamentSettings?.name || tournament.name || 'Névtelen verseny',
                      startDate: tournament.tournamentSettings?.startDate || tournament.startDate,
                      location: tournament.tournamentSettings?.location || tournament.location,
                      type: tournament.tournamentSettings?.type || tournament.type,
                      entryFee: tournament.tournamentSettings?.entryFee || tournament.entryFee,
                      maxPlayers: tournament.tournamentSettings?.maxPlayers || tournament.maxPlayers,
                      registrationDeadline:
                        tournament.tournamentSettings?.registrationDeadline || tournament.registrationDeadline,
                      status: tournament.tournamentSettings?.status || tournament.status || 'pending',
                    },
                    tournamentPlayers: tournament.tournamentPlayers || [],
                    clubId: tournament.clubId || { name: '' },
                  }}
                  userRole={canManage ? 'moderator' : 'member'}
                  showActions={false}
                />

                {canManage && (
                  <Button
                    variant="destructive"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      setTournamentToDetach({
                        id: tournament._id,
                        name: tournament.tournamentSettings?.name || tournament.name || 'Névtelen verseny',
                      });
                      setShowDetachModal(true);
                    }}
                  >
                    Verseny eltávolítása
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showAttachModal} onOpenChange={(open) => !open && setShowAttachModal(false)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Verseny hozzárendelése</DialogTitle>
            <DialogDescription>
              Csak befejezett versenyek választhatók. A pontszámítás csak friss versenyekhez ajánlott.
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="flex justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Válassz versenyt</Label>
                <select
                  value={selectedTournamentId}
                  onChange={(event) => setSelectedTournamentId(event.target.value)}
                  className="w-full rounded-md bg-background px-3 py-2 text-sm outline-none shadow-sm shadow-black/10 focus-visible:ring-2 focus-visible:ring-primary/20"
                >
                  <option value="">Válassz...</option>
                  {availableTournaments.map((tournament: any) => (
                    <option key={tournament._id} value={tournament._id}>
                      {tournament.tournamentSettings.name} •{' '}
                      {new Date(tournament.tournamentSettings.startDate).toLocaleDateString('hu-HU')}
                    </option>
                  ))}
                </select>
                {availableTournaments.length === 0 && (
                  <p className="text-xs text-warning">Nincs elérhető befejezett verseny.</p>
                )}
              </div>

              <div className="space-y-2">
                <div className="rounded-md bg-primary/5 px-3 py-2 text-sm">
                  <p className="font-medium text-foreground">Pontszámítási rendszer:</p>
                  <p className="text-xs text-muted-foreground">
                    {pointSystemType === 'remiz_christmas' 
                      ? 'Remiz Christmas Series pontszámítás (20 pont részvétel + csoport pontok + helyezési pontok)'
                      : 'Platform pontszámítás (geometrikus progresszió)'}
                  </p>
                </div>
                <div className="flex items-start justify-between gap-3 rounded-md bg-muted/40 px-3 py-2 shadow-sm shadow-black/5">
                  <label className="text-sm font-medium text-foreground">
                    Pontszámítás engedélyezése
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      Nem javasolt már befejezett versenyeknél.
                    </span>
                  </label>
                  <input
                    type="checkbox"
                    checked={calculatePoints}
                    onChange={(event) => setCalculatePoints(event.target.checked)}
                    className="h-4 w-4 rounded accent-primary"
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="ghost"
              onClick={() => {
                setShowAttachModal(false);
                setSelectedTournamentId('');
                setCalculatePoints(false);
              }}
            >
              Mégse
            </Button>
            <Button onClick={handleAttachTournament} disabled={loading || !selectedTournamentId}>
              {loading ? 'Hozzárendelés...' : 'Hozzárendelés'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDetachModal} onOpenChange={(open) => !open && setShowDetachModal(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Verseny eltávolítása</DialogTitle>
            <DialogDescription>
              Biztosan törölni szeretnéd a(z) &quot;{tournamentToDetach?.name}&quot; versenyt a ligából?
              Ez a művelet visszavonhatatlanul törli a versenyhez tartozó összes pontot a ranglistáról.
            </DialogDescription>
          </DialogHeader>

          <p className="text-sm text-muted-foreground">
            Verseny: <span className="font-semibold text-foreground">{tournamentToDetach?.name}</span>
          </p>

          <Alert className="border-destructive/40 bg-destructive/10">
            <AlertDescription>
              Biztosan eltávolítod ezt a versenyt a ligából?
            </AlertDescription>
          </Alert>

          <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="ghost" onClick={() => setShowDetachModal(false)}>
              Mégse
            </Button>
            <Button variant="destructive" onClick={handleDetachTournament} disabled={loading}>
              Eltávolítás
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface SettingsTabProps {
  league: League;
  clubId: string;
  onLeagueUpdated: () => void;
  leagueStats: LeagueStatsResponse | null;
  disabled?: boolean;
}

function SettingsTab({ league, clubId, onLeagueUpdated, leagueStats, disabled }: SettingsTabProps) {
  const [activeSubTab, setActiveSubTab] = useState<'settings' | 'history'>('settings');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: league.name,
    description: league.description || '',
    pointsConfig: { ...league.pointsConfig },
    pointSystemType: league.pointSystemType || 'platform',
    isActive: league.isActive ?? true,
  });

  useEffect(() => {
    setFormData({
      name: league.name,
      description: league.description || '',
      pointsConfig: { ...league.pointsConfig },
      pointSystemType: league.pointSystemType || 'platform',
      isActive: league.isActive ?? true,
    });
  }, [league]);

  const handleUndoAdjustment = async (playerId: string, adjustmentIndex: number) => {
    if (!confirm('Biztosan visszavonod ezt a pontszám módosítást?')) return;

    try {
      const response = await fetch(`/api/clubs/${clubId}/leagues/${league._id}/undo-adjustment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId, adjustmentIndex }),
      });

      if (response.ok) {
        onLeagueUpdated();
        showSuccessToast('Pontszám módosítás visszavonva!');
      } else {
        const errorData = await response.json();
        showErrorToast(errorData.error || 'Hiba a visszavonás során', {
          context: 'Liga pontszám visszavonása',
          error: errorData.error,
        });
      }
    } catch (error) {
      showErrorToast('Hiba a visszavonás során', {
        context: 'Liga pontszám visszavonása',
        error: error instanceof Error ? error.message : 'Ismeretlen hiba',
      });
    }
  };

  const handleUndoRemoval = async (playerId: string, removalIndex: number) => {
    if (!confirm('Biztosan visszahelyezed ezt a játékost a ligába?')) return;

    try {
      const response = await fetch(`/api/clubs/${clubId}/leagues/${league._id}/undo-removal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId, removalIndex }),
      });

      if (response.ok) {
        onLeagueUpdated();
        showSuccessToast('Játékos visszahelyezve a ligába!');
      } else {
        const errorData = await response.json();
        showErrorToast(errorData.error || 'Hiba a visszahelyezés során', {
          context: 'Liga játékos visszahelyezése',
          error: errorData.error,
        });
      }
    } catch (error) {
      showErrorToast('Hiba a visszahelyezés során', {
        context: 'Liga játékos visszahelyezése',
        error: error instanceof Error ? error.message : 'Ismeretlen hiba',
      });
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      // Convert empty strings to 0 in pointsConfig
      const cleanedPointsConfig = Object.entries(formData.pointsConfig || {}).reduce((acc, [key, val]) => {
        acc[key] = val === null || val === undefined || val === '' as unknown as number ? 0 : val;
        return acc;
      }, {} as any);

      const dataToSubmit = {
        ...formData,
        pointsConfig: cleanedPointsConfig,
      };

      const response = await fetch(`/api/clubs/${clubId}/leagues/${league._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSubmit),
      });

      if (response.ok) {
        setIsEditing(false);
        onLeagueUpdated();
        showSuccessToast('Liga beállítások sikeresen mentve!');
      } else {
        showErrorToast('Hiba a mentés során', { context: 'Liga beállítások mentése' });
      }
    } catch (error) {
      showErrorToast('Hiba a mentés során', {
        context: 'Liga beállítások mentése',
        error: error instanceof Error ? error.message : 'Ismeretlen hiba',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: league.name,
      description: league.description || '',
      pointsConfig: { ...league.pointsConfig },
      pointSystemType: league.pointSystemType || 'platform',
      isActive: league.isActive ?? true,
    });
    setIsEditing(false);
  };

  if (disabled) {
    return (
      <Alert>
        <AlertDescription>A liga beállításait csak moderátorok módosíthatják.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h4 className="text-lg font-semibold text-foreground">Liga beállítások</h4>
        {activeSubTab === 'settings' && !isEditing ? (
          <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
            <IconEdit className="mr-2 h-4 w-4" /> Szerkesztés
          </Button>
        ) : null}
      </div>

      {/* Pseudo TabsList - styled as tabs but using buttons to avoid nested Tabs conflict */}
      <div className="inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground w-full">
        <button
          type="button"
          onClick={() => setActiveSubTab('settings')}
          className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 flex-1 ${
            activeSubTab === 'settings' 
              ? 'bg-background text-foreground shadow-sm' 
              : 'hover:bg-background/50'
          }`}
        >
          Beállítások
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('history')}
          className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 flex-1 ${
            activeSubTab === 'history' 
              ? 'bg-background text-foreground shadow-sm' 
              : 'hover:bg-background/50'
          }`}
        >
          Pontszámítás történet
        </button>
      </div>

      {activeSubTab === 'history' ? (
        <div className="space-y-6">
          <Card className="border-none bg-card/40">
            <CardHeader>
              <CardTitle className="text-base">Eltávolított játékosok</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {leagueStats?.league?.removedPlayers?.length ? (
                leagueStats.league.removedPlayers.map((removal: any, index: number) => (
                  <div
                    key={index}
                    className="rounded-lg bg-background/80 px-3 py-3"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant="destructive" className="text-xs">Eltávolítva</Badge>
                          <span className="font-medium text-foreground">
                            {removal.player?.name || removal.player?.username || 'Ismeretlen játékos'}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {removal.totalPoints} pont • {removal.tournamentPoints?.length || 0} verseny •{' '}
                          {removal.manualAdjustments?.length || 0} módosítás
                        </p>
                        <p className="text-xs italic text-muted-foreground/80">{removal.reason}</p>
                      </div>
                      <div className="text-right text-xs text-muted-foreground">
                        <div className="flex items-center justify-end gap-1">
                          <IconUser className="h-3 w-3" />
                          <span>{removal.removedBy?.name || removal.removedBy?.username || 'Ismeretlen'}</span>
                        </div>
                        <div>{new Date(removal.removedAt).toLocaleDateString('hu-HU')}</div>
                      </div>
                    </div>
                    <div className="mt-3 flex justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleUndoRemoval(removal.player._id, index)}
                      >
                        <IconUser className="mr-2 h-4 w-4" /> Visszahelyezés
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">Még nem lett játékos eltávolítva.</p>
              )}
            </CardContent>
          </Card>

          <Card className="border-none bg-card/40">
            <CardHeader>
              <CardTitle className="text-base">Pontszámításhoz kapcsolódó módosítások</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              {leagueStats?.league?.players?.some((player: any) => player.manualAdjustments?.length) ? (
                leagueStats?.league?.players.map((player: any) => {
                  if (!player.manualAdjustments || player.manualAdjustments.length === 0) return null;
                  return (
                    <div key={player.player._id} className="rounded-lg bg-background/80 px-3 py-3 shadow-sm shadow-black/5">
                      <div className="mb-3 flex items-center justify-between">
                        <h6 className="font-medium text-foreground">
                          {player.player.name || player.player.username || 'Ismeretlen játékos'}
                        </h6>
                        <Badge variant="secondary" className="text-xs">
                          {player.manualAdjustments.length} módosítás
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        {player.manualAdjustments.map((adjustment: any, index: number) => (
                          <div
                            key={index}
                            className="flex flex-col gap-2 rounded-md bg-muted/30 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant={adjustment.points > 0 ? 'default' : 'destructive'}
                                  className="text-xs"
                                >
                                  {adjustment.points > 0 ? '+' : ''}
                                  {adjustment.points} pont
                                </Badge>
                                <span className="font-medium text-foreground">{adjustment.reason}</span>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {adjustment.points > 0 ? 'Pont hozzáadva' : 'Pont levonva'}{' '}
                                {player.player.name || player.player.username || 'játékosnak'}
                              </p>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-right text-xs text-muted-foreground">
                                <div className="flex items-center justify-end gap-1">
                                  <IconUser className="h-3 w-3" />
                                  <span>
                                    {adjustment.adjustedBy?.name || adjustment.adjustedBy?.username || 'Ismeretlen'}
                                  </span>
                                </div>
                                <div>{new Date(adjustment.adjustedAt).toLocaleDateString('hu-HU')}</div>
                              </div>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleUndoAdjustment(player.player._id, index)}
                              >
                                <IconTrash className="mr-2 h-4 w-4" /> Visszavonás
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-muted-foreground">Még nincsenek manuális pontszámítás módosítások.</p>
              )}
            </CardContent>
          </Card>
        </div>
      ) : isEditing ? (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Liga neve</Label>
              <Input
                value={formData.name}
                onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                placeholder="Liga neve"
              />
            </div>
            <div className="space-y-2">
              <Label>Leírás</Label>
              <textarea
                className="min-h-[80px] w-full rounded-md bg-background px-3 py-2 text-sm outline-none shadow-sm shadow-black/10 focus-visible:ring-2 focus-visible:ring-primary/20"
                value={formData.description}
                onChange={(event) => setFormData({ ...formData, description: event.target.value })}
                placeholder="Liga leírása"
              />
            </div>
          </div>
          
          <div className="space-y-2">
             <div className="flex items-start justify-between gap-3 rounded-md bg-muted/40 px-3 py-2 shadow-sm shadow-black/5">
                <div>
                   <label className="text-sm font-medium text-foreground block">Liga státusza</label>
                   <span className="text-xs text-muted-foreground block mt-0.5">
                     Ha kikapcsolod, a liga &quot;Lezárt&quot; státuszba kerül, és nem jelenik meg az alapértelmezett keresési listákban.
                   </span>
                </div>
                <div className="flex items-center gap-2">
                   <span className={formData.isActive ? "text-sm font-medium text-green-500" : "text-sm font-medium text-muted-foreground"}>
                      {formData.isActive ? "Aktív" : "Lezárt"}
                   </span>
                   <input
                     type="checkbox"
                     checked={formData.isActive}
                     onChange={(event) => setFormData({ ...formData, isActive: event.target.checked })}
                     className="h-5 w-5 rounded accent-primary cursor-pointer"
                   />
                </div>
             </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="point-system-type">Pontszámítási rendszer</Label>
            <select
              id="point-system-type"
              value={formData.pointSystemType || 'platform'}
              onChange={(e) => setFormData({ ...formData, pointSystemType: e.target.value as 'platform' | 'remiz_christmas' })}
              className="w-full rounded-md bg-background px-3 py-2 text-sm outline-none shadow-sm shadow-black/10 focus-visible:ring-2 focus-visible:ring-primary/20"
            >
              <option value="platform">Platform pontszámítás</option>
              <option value="remiz_christmas">Remiz Christmas Series pontszámítás</option>
            </select>
            <p className="text-xs text-muted-foreground">
              {formData.pointSystemType === 'remiz_christmas' 
                ? 'Fix pontrendszer: 20 pont részvétel, csoport pontok a csoport mérete és győzelmek alapján, helyezési pontok a végső helyezés alapján.'
                : 'Geometrikus progresszió alapú pontszámítás a csoportkör és egyenes kiesés eredményei alapján.'}
            </p>
          </div>

          {formData.pointSystemType === 'platform' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <IconInfoCircle className="h-4 w-4" /> Pontszámítás beállítások
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {[
                { key: 'groupDropoutPoints', label: 'Csoportkör kiesés pontjai' },
                { key: 'knockoutBasePoints', label: 'Egyenes kiesés alappont' },
                { key: 'knockoutMultiplier', label: 'Szorzó tényező', step: 0.1 },
                { key: 'winnerBonus', label: 'Győztes bónusz' },
                { key: 'maxKnockoutRounds', label: 'Max. kiesős körök' },
              ].map((config) => (
                <div key={config.key} className="space-y-2">
                  <Label>{config.label}</Label>
                  <Input
                    type="number"
                    min={0}
                    step={config.step ?? 1}
                    value={(formData.pointsConfig as any)[config.key] ?? ''}
                    onChange={(event) => {
                      const val = event.target.value;
                      setFormData({
                        ...formData,
                        pointsConfig: {
                          ...formData.pointsConfig,
                          [config.key]: val === '' ? '' : (config.step ? parseFloat(val) : parseInt(val, 10)),
                        },
                      });
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
          )}

          {formData.pointSystemType === 'platform' && (
          <Alert className="border-primary/30 bg-primary/5">
            <AlertDescription>
              Tippek: tartsd alacsonyan a szorzót, hogy a pontszámítás kiegyensúlyozott maradjon.
            </AlertDescription>
          </Alert>
          )}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="ghost" onClick={handleCancel} disabled={loading}>
              Mégse
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? 'Mentés...' : 'Mentés'}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4 text-sm text-muted-foreground">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground/60">
              Liga neve
            </p>
            <p className="text-base text-foreground">{league.name}</p>
          </div>
          {league.description && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground/60">Leírás</p>
              <p className="text-base text-foreground">{league.description}</p>
            </div>
          )}
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground/60">Státusz</p>
            <div className="flex items-center gap-2 mt-1">
                 <Badge variant={league.isActive ? "default" : "secondary"}>
                    {league.isActive ? "Aktív" : "Lezárt"}
                 </Badge>
                 {!league.isActive && (
                     <span className="text-xs text-muted-foreground">(Nem jelenik meg a keresőkben)</span>
                 )}
            </div>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground/60">Pontszámítási rendszer</p>
            <p className="text-base text-foreground">
              {league.pointSystemType === 'remiz_christmas' 
                ? 'Remiz Christmas Series pontszámítás'
                : 'Platform pontszámítás'}
            </p>
            {league.pointSystemType === 'remiz_christmas' && (
              <p className="text-xs text-muted-foreground mt-1">
                20 pont részvétel + csoport pontok + helyezési pontok
              </p>
            )}
          </div>
          {league.pointSystemType === 'platform' && (
          <div className="grid gap-3 md:grid-cols-2">
            <InfoRow label="Csoportkör kiesés pontjai" value={league.pointsConfig.groupDropoutPoints} />
            <InfoRow label="Egyenes kiesés alappont" value={league.pointsConfig.knockoutBasePoints} />
            <InfoRow
              label="Szorzó tényező"
              value={(league.pointsConfig.knockoutMultiplier || 0).toFixed(2)}
            />
            <InfoRow label="Győztes bónusz" value={league.pointsConfig.winnerBonus} />
            <InfoRow label="Max. kiesős körök" value={league.pointsConfig.maxKnockoutRounds} />
          </div>
          )}
        </div>
      )}
    </div>
  );
}

const InfoRow = ({ label, value }: { label: string; value: number | string }) => (
  <div className="rounded-md bg-muted/30 px-3 py-2">
    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground/70">{label}</p>
    <p className="text-base font-semibold text-foreground">{value}</p>
  </div>
);

