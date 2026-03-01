'use client';
import { useTranslations } from "next-intl";


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
import { POINT_SYSTEMS, PointSystemId, getPointSystemDefinition } from '@/lib/leaguePointSystems';
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
  const tTour = useTranslations("Club");
  const t = (key: string, values?: any) => tTour(`components.${key}`, values);
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
        showSuccessToast(t("liga_link_másolva"));
      }
    } catch (err) {
      console.error('Error sharing league:', err);
      try {
        await navigator.clipboard.writeText(shareUrl);
        showSuccessToast(t("liga_link_másolva"));
      } catch {
        showErrorToast(t("nem_sikerült_másolni_16"));
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
      showErrorToast(t("hiba_a_pontszám"), {
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
        showSuccessToast(t("játékos_sikeresen_hozzáadva"));
      } else {
        const errorData = await response.json();
        showErrorToast(errorData.error || 'Hiba a játékos hozzáadása során', {
          context: 'Liga játékos hozzáadása',
          error: errorData.error,
        });
      }
    } catch (error) {
      showErrorToast(t("hiba_a_játékos"), {
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
      showErrorToast(t("hiba_a_játékos_47"), {
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
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto px-0 py-0 flex flex-col">
        <div className="flex flex-col">
          <DialogHeader className="px-6 pt-6 pb-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <DialogTitle className="text-2xl font-semibold text-foreground flex items-center gap-2">
                  {league.name}
                  {!league.isActive && (
                    <Badge variant="secondary" className="text-xs">{t("lezárt")}</Badge>
                  )}
                </DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground">
                  {t("kezeld_a_liga")}</DialogDescription>
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

          <div className="mt-4 px-6 pb-6">
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabType)} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="leaderboard">{t("ranglista")}</TabsTrigger>
                <TabsTrigger value="tournaments">{t("versenyek")}</TabsTrigger>
                <TabsTrigger value="settings" disabled={!canManage}>
                  {t("beállítások")}</TabsTrigger>
              </TabsList>

              <TabsContent value="leaderboard" className="mt-4">
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

              <TabsContent value="tournaments" className="mt-4">
                <TournamentsTab
                  tournaments={leagueStats?.league?.attachedTournaments || []}
                  canManage={canManage}
                  clubId={clubId}
                  leagueId={league._id!}
                  onTournamentAttached={fetchLeagueStats}
                  pointSystemType={league.pointSystemType || 'platform'}
                />
              </TabsContent>

              <TabsContent value="settings" className="mt-4">
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
    const tTour = useTranslations("Club");
  const t = (key: string, values?: any) => tTour(`components.${key}`, values);
  const items = [
    {
      icon: <IconUsers className="h-5 w-5" />,
      label: t("jatekosok_kw3i"),
      value: stats.totalPlayers,
    },
    {
      icon: <IconTrophy className="h-5 w-5" />,
      label: t("csatlakoztatott_versenyek_gfqv"),
      value: stats.totalTournaments,
    },
    {
      icon: <IconArrowRight className="h-5 w-5" />,
      label: t("atlag_pont_verseny_9ej7"),
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
  const t = useTranslations("Club.components");
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
      showErrorToast(t("kérlek_adj_meg"), {
        context: 'Liga pontszám módosítása',
        reportable: false,
      });
      return;
    }

    const parsedValue = parseInt(rawValue, 10);
    if (Number.isNaN(parsedValue)) {
      showErrorToast(t("érvénytelen_pontszám_formátum"), {
        context: 'Liga pontszám módosítása',
        reportable: false,
      });
      return;
    }

    if (!adjustReason.trim()) {
      showErrorToast(t("kérlek_add_meg"), {
        context: 'Liga pontszám módosítása',
        reportable: false,
      });
      return;
    }

    let pointsToAdjust = parsedValue;
    if (adjustDialog.mode === 'set') {
      pointsToAdjust = parsedValue - (adjustDialog.player?.currentPoints ?? 0);
      if (pointsToAdjust === 0) {
        showErrorToast(t("az_új_pontszám"), {
          context: 'Liga pontszám módosítása',
          reportable: false,
        });
        return;
      }
    } else if (pointsToAdjust === 0) {
      showErrorToast(t("a_pontszám_változás"), {
        context: 'Liga pontszám módosítása',
        reportable: false,
      });
      return;
    }

    onAdjustPoints(adjustDialog.player.id, pointsToAdjust, adjustReason);
    setAdjustDialog({ open: false, mode: 'adjust' });
    setAdjustPoints('');
    setAdjustReason('');
    showSuccessToast(t("pontszám_sikeresen_módosítva"));
  };

  const handleSubmitRemove = () => {
    if (!removeDialog.player) return;
    if (!removeReason.trim()) {
      showErrorToast(t("kérlek_add_meg_57"), {
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
            <CardTitle className="text-base">{t("liga_leírása")}</CardTitle>
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
              <h4 className="text-sm font-semibold text-foreground">{t("játékos_hozzáadása_a")}</h4>
            </div>
            <PlayerSearch
              onPlayerSelected={onAddPlayer}
              placeholder={t("játékos_keresése_és")}
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
            <p className="text-sm text-muted-foreground">{t("még_nincsenek_játékosok")}</p>
            {canManage && (
              <p className="text-xs text-muted-foreground/80">
                {t("használd_a_fenti")}</p>
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
                    <th className="px-4 py-3 text-left">{t("játékos_22")}</th>
                    <th className="px-4 py-3 text-right">{t("pont_53")}</th>
                    <th className="px-4 py-3 text-right hidden sm:table-cell">{t("versenyek")}</th>
                    <th className="px-4 py-3 text-right hidden md:table-cell">{t("átlag_hely")}</th>
                    <th className="px-4 py-3 text-right hidden md:table-cell">{t("legjobb")}</th>
                    <th className="px-4 py-3 text-right hidden lg:table-cell">{t("dobás_átlag")}</th>
                    {canManage && <th className="px-4 py-3 text-right">{t("műveletek")}</th>}
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
            <DialogTitle>{t("pontszám_módosítása")}</DialogTitle>
            <DialogDescription>
              {adjustDialog.player?.name} {t("jelenlegi_pontszáma")}{' '}
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
              {t("módosítás")}</Button>
            <Button
              variant={adjustDialog.mode === 'set' ? 'default' : 'outline'}
              className="flex-1"
              onClick={() => {
                setAdjustDialog((prev) => ({ ...prev, mode: 'set' }));
                setAdjustPoints('');
              }}
            >
              {t("beállítás")}</Button>
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
            <Label>{t("indoklás")}</Label>
            <textarea
              className="min-h-[80px] w-full rounded-md bg-background px-3 py-2 text-sm outline-none shadow-sm shadow-black/10 focus-visible:ring-2 focus-visible:ring-primary/20"
              value={adjustReason}
              onChange={(event) => setAdjustReason(event.target.value)}
              placeholder={t("miért_módosítod_a")}
            />
          </div>

          <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="ghost" onClick={() => setAdjustDialog({ open: false, mode: 'adjust' })}>
              {t("mégse")}</Button>
            <Button onClick={handleSubmitAdjust}>{t("mentés_60")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={removeDialog.open && !!removeDialog.player}
        onOpenChange={(open) => !open && setRemoveDialog({ open: false })}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive">{t("játékos_eltávolítása")}</DialogTitle>
            <DialogDescription>
              {removeDialog.player?.name} {t("jelenlegi_pontszáma")}{' '}
              <span className="font-mono font-semibold text-primary">
                {removeDialog.player?.currentPoints}
              </span>
            </DialogDescription>
          </DialogHeader>

          <Alert className="border-destructive/40 bg-destructive/10">
            <AlertDescription>
              {t("ez_a_művelet_0")}</AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label>{t("eltávolítás_oka")}</Label>
            <textarea
              className="min-h-[80px] w-full rounded-md bg-background px-3 py-2 text-sm outline-none shadow-sm shadow-black/10 focus-visible:ring-2 focus-visible:ring-primary/20"
              value={removeReason}
              onChange={(event) => setRemoveReason(event.target.value)}
              placeholder={t("miért_távolítod_el")}
            />
          </div>

          <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="ghost" onClick={() => setRemoveDialog({ open: false })}>
              {t("mégse")}</Button>
            <Button variant="destructive" onClick={handleSubmitRemove}>
              {t("eltávolítás")}</Button>
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
  pointSystemType?: PointSystemId;
}

function TournamentsTab({ tournaments, canManage, clubId, leagueId, onTournamentAttached, pointSystemType = 'platform' }: TournamentsTabProps) {
  const t = useTranslations("Club.components");
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
      showErrorToast(t("nem_sikerült_betölteni_73"), {
        context: 'Verseny betöltése',
        error: error instanceof Error ? error.message : 'Ismeretlen hiba',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAttachTournament = async () => {
    if (!selectedTournamentId) {
      showErrorToast(t("kérlek_válassz_egy"), {
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
      showErrorToast(t("hiba_a_verseny"), {
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
        showSuccessToast(t("verseny_sikeresen_eltávolítva"));
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
      showErrorToast(t("hiba_a_verseny_84"), {
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
            {t("befejezett_verseny_hozzárendelése")}</Button>
        </div>
      )}

      {validTournaments.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center space-y-3">
            <div className="text-4xl">🏆</div>
            <p className="text-sm text-muted-foreground">{t("ehhez_a_ligához")}</p>
            {canManage && (
              <div className="rounded-lg bg-muted/30 px-4 py-3 text-left text-xs text-muted-foreground shadow-sm shadow-black/5">
                <p className="font-semibold text-foreground">{t("versenyek_hozzáadása")}</p>
                <ul className="mt-1 space-y-1">
                  <li>{t("új_verseny_létrehozásakor")}</li>
                  <li>{t("már_befejezett_versenyeknél")}</li>
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {validTournaments.map((tournament: any) => (
            <Card key={tournament._id} className="border-none bg-transparent">
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
                    {t("verseny_eltávolítása")}</Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showAttachModal} onOpenChange={(open) => !open && setShowAttachModal(false)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("verseny_hozzárendelése")}</DialogTitle>
            <DialogDescription>
              {t("csak_befejezett_versenyek")}</DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="flex justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{t("válassz_versenyt")}</Label>
                <select
                  value={selectedTournamentId}
                  onChange={(event) => setSelectedTournamentId(event.target.value)}
                  className="w-full rounded-md bg-background px-3 py-2 text-sm outline-none shadow-sm shadow-black/10 focus-visible:ring-2 focus-visible:ring-primary/20"
                >
                  <option value="">{t("válassz")}</option>
                  {availableTournaments.map((tournament: any) => (
                    <option key={tournament._id} value={tournament._id}>
                      {tournament.tournamentSettings.name} •{' '}
                      {new Date(tournament.tournamentSettings.startDate).toLocaleDateString('hu-HU')}
                    </option>
                  ))}
                </select>
                {availableTournaments.length === 0 && (
                  <p className="text-xs text-warning">{t("nincs_elérhető_befejezett")}</p>
                )}
              </div>

              <div className="space-y-2">
                <div className="rounded-md bg-primary/5 px-3 py-2 text-sm">
                  <p className="font-medium text-foreground">{t("pontszámítási_rendszer_67")}</p>
                  <p className="text-xs text-muted-foreground">
                    {pointSystemType === 'remiz_christmas'
                      ? 'Remiz Christmas Series pontszámítás (20 pont részvétel + csoport pontok + helyezési pontok)'
                      : pointSystemType === 'platform'
                        ? 'Platform pontszámítás (geometrikus progresszió)'
                        : getPointSystemDefinition(pointSystemType).description}
                  </p>
                </div>
                <div className="flex items-start justify-between gap-3 rounded-md bg-muted/40 px-3 py-2 shadow-sm shadow-black/5">
                  <label className="text-sm font-medium text-foreground">
                    {t("pontszámítás_engedélyezése")}<span className="mt-0.5 block text-xs text-muted-foreground">
                      {t("nem_javasolt_már")}</span>
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
              {t("mégse")}</Button>
            <Button onClick={handleAttachTournament} disabled={loading || !selectedTournamentId}>
              {loading ? 'Hozzárendelés...' : 'Hozzárendelés'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDetachModal} onOpenChange={(open) => !open && setShowDetachModal(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("verseny_eltávolítása")}</DialogTitle>
            <DialogDescription>
              {t("biztosan_törölni_szeretnéd")}{tournamentToDetach?.name}{t("quot_versenyt_a")}</DialogDescription>
          </DialogHeader>

          <p className="text-sm text-muted-foreground">
            {t("verseny")}<span className="font-semibold text-foreground">{tournamentToDetach?.name}</span>
          </p>

          <Alert className="border-destructive/40 bg-destructive/10">
            <AlertDescription>
              {t("biztosan_eltávolítod_ezt")}</AlertDescription>
          </Alert>

          <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="ghost" onClick={() => setShowDetachModal(false)}>
              {t("mégse")}</Button>
            <Button variant="destructive" onClick={handleDetachTournament} disabled={loading}>
              {t("eltávolítás")}</Button>
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
  const t = useTranslations("Club.components");
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
  const isPlacementMode = formData.pointsConfig?.useFixedRanks !== false;

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
        showSuccessToast(t("pontszám_módosítás_visszavonva"));
      } else {
        const errorData = await response.json();
        showErrorToast(errorData.error || 'Hiba a visszavonás során', {
          context: 'Liga pontszám visszavonása',
          error: errorData.error,
        });
      }
    } catch (error) {
      showErrorToast(t("hiba_a_visszavonás"), {
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
        showSuccessToast(t("játékos_visszahelyezve_a"));
      } else {
        const errorData = await response.json();
        showErrorToast(errorData.error || 'Hiba a visszahelyezés során', {
          context: 'Liga játékos visszahelyezése',
          error: errorData.error,
        });
      }
    } catch (error) {
      showErrorToast(t("hiba_a_visszahelyezés"), {
        context: 'Liga játékos visszahelyezése',
        error: error instanceof Error ? error.message : 'Ismeretlen hiba',
      });
    }
  };

  const handleSave = async () => {
    if (league.isActive && !formData.isActive) {
      if (!confirm('Figyelem: A liga lezárása után a beállítások és a ranglista adatai nem lesznek módosíthatóak! Biztosan folytatod?')) {
        return;
      }
    }

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
        showSuccessToast(t("liga_beállítások_sikeresen"));
      } else {
        showErrorToast(t("hiba_a_mentés"), { context: 'Liga beállítások mentése' });
      }
    } catch (error) {
      showErrorToast(t("hiba_a_mentés"), {
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
        <AlertDescription>{t("a_liga_beállításait")}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h4 className="text-lg font-semibold text-foreground">{t("liga_beállítások")}</h4>
        {activeSubTab === 'settings' && !isEditing ? (
          <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
            <IconEdit className="mr-2 h-4 w-4" /> {t("szerkesztés")}</Button>
        ) : null}
      </div>

      {/* Pseudo TabsList - styled as tabs but using buttons to avoid nested Tabs conflict */}
      <div className="inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground w-full">
        <button
          type="button"
          onClick={() => setActiveSubTab('settings')}
          className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 flex-1 ${activeSubTab === 'settings'
              ? 'bg-background text-foreground shadow-sm'
              : 'hover:bg-background/50'
            }`}
        >
          {t("beállítások")}</button>
        <button
          type="button"
          onClick={() => setActiveSubTab('history')}
          className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 flex-1 ${activeSubTab === 'history'
              ? 'bg-background text-foreground shadow-sm'
              : 'hover:bg-background/50'
            }`}
        >
          {t("pontszámítás_történet")}</button>
      </div>

      {activeSubTab === 'history' ? (
        <div className="space-y-6">
          <Card className="border-none bg-card/40">
            <CardHeader>
              <CardTitle className="text-base">{t("eltávolított_játékosok")}</CardTitle>
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
                          <Badge variant="destructive" className="text-xs">{t("eltávolítva")}</Badge>
                          <span className="font-medium text-foreground">
                            {removal.player?.name || removal.player?.username || 'Ismeretlen játékos'}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {removal.totalPoints} {t("pont_83")}{removal.tournamentPoints?.length || 0} {t("verseny_92")}{' '}
                          {removal.manualAdjustments?.length || 0} {t("módosítás_12")}</p>
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
                        <IconUser className="mr-2 h-4 w-4" /> {t("visszahelyezés")}</Button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">{t("még_nem_lett")}</p>
              )}
            </CardContent>
          </Card>

          <Card className="border-none bg-card/40">
            <CardHeader>
              <CardTitle className="text-base">{t("pontszámításhoz_kapcsolódó_módosítások")}</CardTitle>
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
                          {player.manualAdjustments.length} {t("módosítás_35")}</Badge>
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
                                  {adjustment.points} {t("pont")}</Badge>
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
                                <IconTrash className="mr-2 h-4 w-4" /> {t("visszavonás")}</Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-muted-foreground">{t("még_nincsenek_manuális")}</p>
              )}
            </CardContent>
          </Card>
        </div>
      ) : isEditing ? (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>{t("liga_neve_91")}</Label>
              <Input
                value={formData.name}
                onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                placeholder={t("liga_neve_28")}
              />
              <Label>{t("leírás")}</Label>
              <textarea
                className="min-h-[80px] w-full border rounded-md bg-background px-3 py-2 text-sm outline-none shadow-sm shadow-black/10 focus-visible:ring-2 focus-visible:ring-primary/20"
                value={formData.description}
                onChange={(event) => setFormData({ ...formData, description: event.target.value })}
                placeholder={t("liga_leírása")}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-start justify-between gap-3 rounded-md bg-muted/40 px-3 py-2 shadow-sm shadow-black/5">
              <div>
                <label className="text-sm font-medium text-foreground block">{t("liga_státusza")}</label>
                <span className="text-xs text-muted-foreground block mt-0.5">
                  {t("ha_kikapcsolod_a")}</span>
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
            {!formData.isActive && (
              <Alert className="border-warning/50 bg-warning/5 py-3">
                <IconInfoCircle className="h-4 w-4 text-warning" />
                <AlertDescription className="text-xs text-warning font-medium">
                  {t("figyelem_a_liga")}</AlertDescription>
              </Alert>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="point-system-type">{t("pontszámítási_rendszer_7")}</Label>
            <select
              id="point-system-type"
              value={formData.pointSystemType || 'platform'}
              onChange={(e) => setFormData((prev) => ({ ...prev, pointSystemType: e.target.value as PointSystemId }))}
              className="w-full rounded-md bg-background px-3 py-2 text-sm outline-none shadow-sm shadow-black/10 focus-visible:ring-2 focus-visible:ring-primary/20"
            >
              {POINT_SYSTEMS.map((system) => (
                <option key={system.id} value={system.id}>
                  {system.id === 'platform'
                    ? t("platform_pontszámítás")
                    : system.id === 'remiz_christmas'
                      ? t("remiz_christmas_series")
                      : system.id === 'ontour'
                        ? t("dartsbarlang_ontour_pontszámítás")
                        : system.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              {formData.pointSystemType === 'remiz_christmas'
                ? 'Fix pontrendszer: 20 pont részvétel, csoport pontok a csoport mérete és győzelmek alapján, helyezési pontok a végső helyezés alapján.'
                : formData.pointSystemType === 'ontour'
                  ? 'Fix pontrendszer: 1. 45pont 2. 32pont 3. 24pont 4. 20pont 8. 16pont 16. 10pont 32. 4pont 48. 2 pont'
                  : formData.pointSystemType === 'platform'
                    ? 'Helyezés alapú pontozás: add meg, melyik helyezés hány pontot ér, a csoportkiesők külön fix pontot kapnak.'
                    : getPointSystemDefinition(formData.pointSystemType).description}
            </p>
          </div>

          {formData.pointSystemType === 'platform' && (
            <div className="space-y-3">
              <div className="rounded-md border border-muted bg-muted/30 p-3 text-sm">
                <label className="flex items-center gap-2 font-medium">
                  <input
                    type="checkbox"
                    checked={!isPlacementMode}
                    onChange={(event) =>
                      setFormData({
                        ...formData,
                        pointsConfig: {
                          ...formData.pointsConfig,
                          useFixedRanks: !event.target.checked,
                        },
                      })
                    }
                    className="h-4 w-4 rounded accent-primary"
                  />
                  Legacy geometrikus mód (átmeneti kompatibilitás)
                </label>
              </div>
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <IconInfoCircle className="h-4 w-4" /> {t("pontszámítás_beállítások")}</div>
              <div className="grid gap-4 md:grid-cols-2">
                {isPlacementMode ? (
                  <>
                    <div className="space-y-2">
                      <Label>{t("csoportkor_kieses_pontjai_1yik")}</Label>
                      <Input
                        type="number"
                        min={0}
                        value={(formData.pointsConfig as any).groupDropoutPoints ?? 0}
                        onChange={(event) => {
                          const val = event.target.value;
                          setFormData({
                            ...formData,
                            pointsConfig: {
                              ...formData.pointsConfig,
                              groupDropoutPoints: val === '' ? 0 : parseInt(val, 10),
                            },
                          });
                        }}
                      />
                    </div>

                    {[1, 2, 3, 4, 8, 16, 32].map((placement) => (
                      <div key={placement} className="space-y-2">
                        <Label>{placement}. helyezés pontja</Label>
                        <Input
                          type="number"
                          min={0}
                          value={((formData.pointsConfig?.fixedRankPoints as any)?.[placement] ?? 0) as number}
                          onChange={(event) => {
                            const val = event.target.value;
                            setFormData({
                              ...formData,
                              pointsConfig: {
                                ...formData.pointsConfig,
                                useFixedRanks: true,
                                fixedRankPoints: {
                                  ...(formData.pointsConfig?.fixedRankPoints || {}),
                                  [placement]: val === '' ? 0 : parseInt(val, 10),
                                }
                              },
                            });
                          }}
                        />
                      </div>
                    ))}
                  </>
                ) : (
                  <>
                    {[
                      { key: 'groupDropoutPoints', label: t("csoportkor_kieses_pontjai_1yik") },
                      { key: 'knockoutBasePoints', label: t("egyenes_kieses_alappont_kkrk") },
                      { key: 'knockoutMultiplier', label: t("szorzo_tenyezo_fyk4"), step: 0.1 },
                      { key: 'winnerBonus', label: t("gyoztes_bonusz_pzwy") },
                      { key: 'maxKnockoutRounds', label: t("max_kiesos_korok_j57q") },
                    ].map((config) => (
                      <div key={config.key} className="space-y-2">
                        <Label>{config.label}</Label>
                        <Input
                          type="number"
                          min={0}
                          step={config.step ?? 1}
                          value={(formData.pointsConfig as any)[config.key] ?? 0}
                          onChange={(event) => {
                            const val = event.target.value;
                            setFormData({
                              ...formData,
                              pointsConfig: {
                                ...formData.pointsConfig,
                                [config.key]: val === '' ? 0 : (config.step ? parseFloat(val) : parseInt(val, 10)),
                              },
                            });
                          }}
                        />
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          )}

          {formData.pointSystemType === 'platform' && (
            <Alert className="border-primary/30 bg-primary/5">
              <AlertDescription>
                {isPlacementMode
                  ? 'Ha nincs bronzmeccs, a két elődöntő-vesztes 4. helyezés pontot kap. A csoportkiesők mindig a fix kieső pontot kapják.'
                  : 'Legacy geometrikus mód aktív. A helyezéses mód ajánlott új ligákhoz.'}
              </AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="ghost" onClick={handleCancel} disabled={loading}>
              {t("mégse")}</Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? 'Mentés...' : 'Mentés'}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4 text-sm text-muted-foreground">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground/60">
              {t("liga_neve_18")}</p>
            <p className="text-base text-foreground">{league.name}</p>
          </div>
          {league.description && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground/60">{t("leírás")}</p>
              <p className="text-base text-foreground">{league.description}</p>
            </div>
          )}
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground/60">{t("státusz")}</p>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={league.isActive ? "default" : "secondary"}>
                {league.isActive ? "Aktív" : "Lezárt"}
              </Badge>
              {!league.isActive && (
                <span className="text-xs text-muted-foreground">{t("nem_jelenik_meg")}</span>
              )}
            </div>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground/60">{t("pontszámítási_rendszer_0")}</p>
            <p className="text-base text-foreground">
              {league.pointSystemType === 'remiz_christmas'
                ? 'Remiz Christmas Series pontszámítás'
                : league.pointSystemType === 'platform'
                  ? 'Platform pontszámítás'
                  : getPointSystemDefinition(league.pointSystemType).label}
            </p>
            {league.pointSystemType === 'remiz_christmas' && (
              <p className="text-xs text-muted-foreground mt-1">
                {t("pont_részvétel_csoport")}</p>
            )}
          </div>
          {league.pointSystemType === 'platform' && (
            <div className="grid gap-3 md:grid-cols-2">
              {league.pointsConfig.useFixedRanks !== false ? (
                <>
                  <InfoRow label={t("csoportkör_kiesés_pontjai")} value={league.pointsConfig.groupDropoutPoints} />
                  <InfoRow label="1. hely" value={(league.pointsConfig.fixedRankPoints as any)?.[1] || 0} />
                  <InfoRow label="2. hely" value={(league.pointsConfig.fixedRankPoints as any)?.[2] || 0} />
                  <InfoRow label="3. hely" value={(league.pointsConfig.fixedRankPoints as any)?.[3] || 0} />
                  <InfoRow label="4. hely" value={(league.pointsConfig.fixedRankPoints as any)?.[4] || 0} />
                  <InfoRow label="8. hely" value={(league.pointsConfig.fixedRankPoints as any)?.[8] || 0} />
                  <InfoRow label="16. hely" value={(league.pointsConfig.fixedRankPoints as any)?.[16] || 0} />
                  <InfoRow label="32. hely" value={(league.pointsConfig.fixedRankPoints as any)?.[32] || 0} />
                </>
              ) : (
                <>
                  <InfoRow label={t("csoportkör_kiesés_pontjai")} value={league.pointsConfig.groupDropoutPoints} />
                  <InfoRow label={t("egyenes_kiesés_alappont")} value={league.pointsConfig.knockoutBasePoints} />
                  <InfoRow label={t("szorzó_tényező")} value={(league.pointsConfig.knockoutMultiplier || 0).toFixed(2)} />
                  <InfoRow label={t("győztes_bónusz")} value={league.pointsConfig.winnerBonus} />
                  <InfoRow label={t("max_kiesős_körök")} value={league.pointsConfig.maxKnockoutRounds} />
                </>
              )}
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

