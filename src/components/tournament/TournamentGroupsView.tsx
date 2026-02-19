"use client";

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import LegsViewModal from './LegsViewModal';
import { IconArrowUp, IconArrowDown } from '@tabler/icons-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { showErrorToast } from '@/lib/toastUtils';
import { useUserContext } from '@/hooks/useUser';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Input } from '@/components/ui/Input';
import{ Label } from '@/components/ui/Label';
import { IconChevronDown, IconEye, IconEdit } from '@tabler/icons-react';

interface Player {
  playerId: {
    _id: string;
    name: string;
  };
  legsWon?: number;
  legsLost?: number;
  average?: number;
  highestCheckout?: number;
  oneEightiesCount?: number;
}

interface Match {
  _id: string;
  player1: Player;
  player2: Player;
  status: string;
  winnerId?: string;
  legsToWin?: number;
  scorer?: {
    _id: string;
    name: string;
  };
  stats?: {
    player1: {
      average: number;
      legsWon: number;
    };
    player2: {
      average: number;
      legsWon: number;
    };
  };
}

interface TournamentGroupsViewProps {
  tournament: any;
  userClubRole?: 'admin' | 'moderator' | 'member' | 'none';
}

const TournamentGroupsView: React.FC<TournamentGroupsViewProps> = ({ tournament, userClubRole }) => {
  const { user } = useUserContext();
  const t = useTranslations();
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [player1Legs, setPlayer1Legs] = useState(0);
  const [player2Legs, setPlayer2Legs] = useState(0);
  const [player1Stats, setPlayer1Stats] = useState({
    highestCheckout: 0,
    oneEightiesCount: 0,
    totalThrows: 0,
    totalScore: 0
  });
  const [player2Stats, setPlayer2Stats] = useState({
    highestCheckout: 0,
    oneEightiesCount: 0,
    totalThrows: 0,
    totalScore: 0
  });
  const [loading, setLoading] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [expandedMatches, setExpandedMatches] = useState<Set<string>>(new Set());
  const [matchFilter, setMatchFilter] = useState<'all' | 'pending' | 'ongoing' | 'finished'>('all');
  const [showLegsModal, setShowLegsModal] = useState(false);
  const [selectedMatchForLegs, setSelectedMatchForLegs] = useState<Match | null>(null);

  const isAdminOrModerator = userClubRole === 'admin' || userClubRole === 'moderator';

  const toggleGroup = (groupId: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId);
    } else {
      newExpanded.add(groupId);
    }
    setExpandedGroups(newExpanded);
  };

  const toggleMatches = (groupId: string) => {
    const newExpanded = new Set(expandedMatches);
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId);
    } else {
      newExpanded.add(groupId);
    }
    setExpandedMatches(newExpanded);
  };

  const handleEditMatch = (match: Match) => {
    setSelectedMatch(match);
    setPlayer1Legs(match.player1.legsWon || 0);
    setPlayer2Legs(match.player2.legsWon || 0);
    setPlayer1Stats({
      highestCheckout: match.player1.highestCheckout || 0,
      oneEightiesCount: match.player1.oneEightiesCount || 0,
      totalThrows: 0,
      totalScore: 0
    });
    setPlayer2Stats({
      highestCheckout: match.player2.highestCheckout || 0,
      oneEightiesCount: match.player2.oneEightiesCount || 0,
      totalThrows: 0,
      totalScore: 0
    });
    setShowAdminModal(true);
  };

  const handleViewLegs = (match: Match) => {
    setSelectedMatchForLegs(match);
    setShowLegsModal(true);
  };

  const handleMovePlayer = async (groupId: string, playerId: string, direction: 'up' | 'down') => {
    if (userClubRole !== 'admin' && userClubRole !== 'moderator') {
      toast.error(t('Tournament.groups.error_no_permission'));
      return;
    }

    const confirmMessage = t('Tournament.groups.confirm_move');
    
    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      const response = await axios.patch(`/api/tournaments/${tournament.tournamentId}/groups/${groupId}/move-player`, {
        playerId,
        direction
      });

      if (response.data.success) {
        toast.success(t('Tournament.groups.success_moved'), {
          duration: 4000,
        });
        window.location.reload();
      } else {
        toast.error(t('Tournament.groups.error_moving'));
      }
    } catch (error) {
      console.error('Error moving player:', error);
      toast.error(t('Tournament.groups.error_moving'));
    }
  };

  const handleSaveMatch = async () => {
    if (!selectedMatch) return;

    if (player1Legs === player2Legs) {
      toast.error(t('Tournament.groups.error_tie'));
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`/api/matches/${selectedMatch._id}/finish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          player1LegsWon: player1Legs,
          player2LegsWon: player2Legs,
          player1Stats,
          player2Stats,
          allowManualFinish: true,
          isManual: true,
          adminId: user?._id
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data?.error || 'Hiba történt a mentés során');
      }

      setShowAdminModal(false);
      setSelectedMatch(null);
      toast.success(t('Tournament.groups.success_saved'));
      window.location.reload();
    } catch (err: any) {
      showErrorToast(err?.message || t('Tournament.groups.error_save'), {
        error: err?.message,
        context: 'Meccs mentése',
        errorName: 'Mentés sikertelen',
      });
      console.error('Save match error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!tournament.groups || tournament.groups.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">{t('Tournament.groups.no_groups')}</p>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-4">
      <h2 className="text-xl font-bold text-foreground">{t('Tournament.groups.title')}</h2>
      
      {tournament.groups.map((group: any, groupIndex: number) => {
        const groupPlayers = tournament.tournamentPlayers
          .filter((player: any) => player.groupId === group._id)
          .sort((a: any, b: any) => (a.groupStanding || 0) - (b.groupStanding || 0));
        
        const isExpanded = expandedGroups.has(group._id);
        const isMatchesExpanded = expandedMatches.has(group._id);

        return (
          <Card key={group._id} className="bg-card shadow-lg shadow-black/20">
            <CardContent className="p-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-bold text-foreground">
                  {t('Tournament.groups.group_number', { number: groupIndex + 1 })} <span className="text-muted-foreground text-sm">({t('Tournament.groups.board_label', { number: group.board })})</span>
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleGroup(group._id)}
                >
                  <IconChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                </Button>
              </div>

              {/* Collapsed State - Compact Player Cards */}
              {!isExpanded && (
                <div className="flex flex-wrap gap-2">
                  {groupPlayers.map((player: any, index: number) => (
                    <div key={player._id} className="bg-muted/50 rounded-md p-2 hover:bg-muted transition-colors">
                      <div className="flex items-center gap-2">
                        <Badge variant="default" className="text-xs">
                          {player.groupStanding || index + 1}.
                        </Badge>
                        <span className="font-medium text-sm text-foreground">
                          {player.playerReference?.name || t('Tournament.groups.table.unknown')}
                        </span>
                        <span className="text-xs text-muted-foreground ml-auto">
                          {(player.stats?.matchesWon || 0) * 2}p
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Expanded State */}
              {isExpanded && (
                <div className="mt-4 space-y-6">
                  {/* Players Table */}
                  <div>
                    <h4 className="font-bold text-base mb-3 text-foreground">{t('Tournament.groups.standings')}</h4>
                    <div className="rounded-md border border-border overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-center w-16">{t('Tournament.groups.table.order')}</TableHead>
                            <TableHead className="text-center w-16">{t('Tournament.groups.table.position')}</TableHead>
                            <TableHead>{t('Tournament.groups.table.name')}</TableHead>
                            {isAdminOrModerator && <TableHead className="text-center w-20">{t('Tournament.groups.table.move')}</TableHead>}
                            <TableHead className="text-center">{t('Tournament.groups.table.points')}</TableHead>
                            <TableHead className="text-center">{t('Tournament.groups.table.won')}</TableHead>
                            <TableHead className="text-center">{t('Tournament.groups.table.lost')}</TableHead>
                            <TableHead className="text-center">{t('Tournament.groups.table.legs_won')}</TableHead>
                            <TableHead className="text-center">{t('Tournament.groups.table.legs_lost')}</TableHead>
                            <TableHead className="text-center">{t('Tournament.groups.table.leg_diff')}</TableHead>
                            <TableHead className="text-center">{t('Tournament.groups.table.average')}</TableHead>
                            <TableHead className="text-center">{t('Tournament.groups.table.180s')}</TableHead>
                            <TableHead className="text-center">{t('Tournament.groups.table.max_checkout')}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {groupPlayers.map((player: any, index: number) => {
                            const stats = player.stats || {};
                            const legDifference = (stats.legsWon || 0) - (stats.legsLost || 0);
                            
                            return (
                              <TableRow key={player._id}>
                                <TableCell className="text-center font-bold">
                                  {player.groupOrdinalNumber + 1}.
                                </TableCell>
                                <TableCell className="text-center font-bold">
                                  {player.groupStanding || index + 1}.
                                </TableCell>
                                <TableCell className="font-semibold">
                                  {player.playerReference?.name || t('Tournament.groups.table.unknown')}
                                </TableCell>
                                {isAdminOrModerator && (
                                  <TableCell className="text-center">
                                    <div className="flex justify-center gap-1">
                                      <Button
                                        onClick={() => handleMovePlayer(group._id, player._id, 'up')}
                                        disabled={index === 0}
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6"
                                        title={t('Tournament.groups.table.move_up')}
                                      >
                                        <IconArrowUp className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        onClick={() => handleMovePlayer(group._id, player._id, 'down')}
                                        disabled={index === groupPlayers.length - 1}
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6"
                                        title={t('Tournament.groups.table.move_down')}
                                      >
                                        <IconArrowDown className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                )}
                                <TableCell className="text-center">
                                  {(stats.matchesWon || 0) * 2}
                                </TableCell>
                                <TableCell className="text-center text-success">
                                  {stats.matchesWon || 0}
                                </TableCell>
                                <TableCell className="text-center text-destructive">
                                  {stats.matchesLost || 0}
                                </TableCell>
                                <TableCell className="text-center text-success">
                                  {stats.legsWon || 0}
                                </TableCell>
                                <TableCell className="text-center text-destructive">
                                  {stats.legsLost || 0}
                                </TableCell>
                                <TableCell className={`text-center font-bold ${legDifference > 0 ? 'text-success' : legDifference < 0 ? 'text-destructive' : ''}`}>
                                  {legDifference > 0 ? '+' : ''}{legDifference}
                                </TableCell>
                                <TableCell className="text-center">
                                  {stats.avg ? stats.avg.toFixed(1) : (stats.average ? stats.average.toFixed(1) : '0.0')}
                                </TableCell>
                                <TableCell className="text-center">
                                  {stats.oneEightiesCount || 0}
                                </TableCell>
                                <TableCell className="text-center">
                                  {stats.highestCheckout || 0}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </div>

                  {/* Matches Section */}
                  <div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-between mb-4"
                      onClick={() => toggleMatches(group._id)}
                    >
                      <span>{t('Tournament.groups.matches')}</span>
                      <IconChevronDown className={`h-4 w-4 transition-transform ${isMatchesExpanded ? "rotate-180" : ""}`} />
                    </Button>

                    {isMatchesExpanded && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <Label className="text-sm">{t('Tournament.groups.filter')}</Label>
                          <Select value={matchFilter} onValueChange={(v) => setMatchFilter(v as any)}>
                            <SelectTrigger className="w-40">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">{t('Tournament.groups.status.all')}</SelectItem>
                              <SelectItem value="pending">{t('Tournament.groups.status.pending')}</SelectItem>
                              <SelectItem value="ongoing">{t('Tournament.groups.status.ongoing')}</SelectItem>
                              <SelectItem value="finished">{t('Tournament.groups.status.finished')}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {group.matches && group.matches.length > 0 ? (
                          <div className="rounded-md border border-border overflow-hidden">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="text-center w-16">#</TableHead>
                                  <TableHead>Játékosok</TableHead>
                                  <TableHead>Pontozó</TableHead>
                                  <TableHead className="text-center">Állapot</TableHead>
                                  <TableHead className="text-center">Átlag</TableHead>
                                  <TableHead className="text-center">Eredmény</TableHead>
                                  <TableHead className="text-center">Műveletek</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {group.matches
                                  .filter((match: Match) =>
                                    matchFilter === 'all' ? true : match.status === matchFilter
                                  )
                                  .map((match: Match, matchIndex: number) => (
                                  <TableRow key={match._id}>
                                    <TableCell className="text-center font-bold">
                                      {matchIndex + 1}.
                                    </TableCell>
                                    <TableCell className="font-semibold">
                                      {match.player1?.playerId?.name || 'Ismeretlen'} vs {match.player2?.playerId?.name || 'Ismeretlen'}
                                    </TableCell>
                                    <TableCell>
                                      {match.scorer?.name || t('Tournament.groups.table.no_scorer')}
                                    </TableCell>
                                    <TableCell className="text-center">
                                      <Badge variant={
                                        match.status === 'pending' ? 'warning' : 
                                        match.status === 'ongoing' ? 'default' : 
                                        match.status === 'finished' ? 'success' : 'outline'
                                      }>
                                        {match.status === 'pending' ? 'Függőben' : 
                                         match.status === 'ongoing' ? 'Folyamatban' : 
                                         match.status === 'finished' ? 'Befejezett' : 'Ismeretlen'}
                                      </Badge>
                                    </TableCell>
                                    <TableCell className="text-center">
                                      {match.player1.average && match.player2.average ? (
                                        <span>
                                          {match.player1.average?.toFixed(1)} - {match.player2.average?.toFixed(1)}
                                        </span>
                                      ) : (
                                        '-'
                                      )}
                                    </TableCell>
                                    <TableCell className="text-center">
                                      {(match.status === 'finished' || match.status === 'ongoing') ? (
                                        <Badge variant="outline">
                                          {match.player1.legsWon} - {match.player2.legsWon}
                                        </Badge>
                                      ) : (
                                        '-'
                                      )}
                                    </TableCell>
                                    <TableCell className="text-center">
                                      <div className="flex justify-center gap-1">
                                        {(match.status === 'ongoing' || match.status === 'finished') && (
                                          <Button
                                            variant="info"
                                            size="sm"
                                            onClick={() => handleViewLegs(match)}
                                            title={t('Tournament.groups.view_legs')}
                                          >
                                            <IconEye className="h-4 w-4 mr-1" />
                                            {t('Tournament.groups.view_legs')}
                                          </Button>
                                        )}
                                        {isAdminOrModerator && tournament.tournamentSettings?.status !== 'finished' && (
                                          <Button
                                            variant="warning"
                                            size="sm"
                                            onClick={() => handleEditMatch(match)}
                                          >
                                            <IconEdit className="h-4 w-4 mr-1" />
                                            {t('Tournament.groups.edit')}
                                          </Button>
                                        )}
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        ) : (
                          <p className="text-muted-foreground text-center py-4">{t('Tournament.groups.no_matches')}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      {/* Admin Modal */}
      <Dialog open={showAdminModal} onOpenChange={setShowAdminModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('Tournament.groups.dialog.edit_match')}</DialogTitle>
            <DialogDescription>
              {selectedMatch && (
                <>
                {selectedMatch.player1?.playerId?.name} vs {selectedMatch.player2?.playerId?.name}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {selectedMatch && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Player 1 Stats */}
              <div className="space-y-4">
                <h5 className="font-bold text-lg text-primary">{selectedMatch.player1?.playerId?.name}</h5>
                
                <div className="space-y-2">
                  <Label htmlFor="p1-legs">{t('Tournament.groups.dialog.won_legs')}</Label>
                  <Input
                    id="p1-legs"
                    type="number"
                    max="10"
                    value={player1Legs}
                    onChange={(e) => setPlayer1Legs(parseInt(e.target.value) || 0)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="p1-180s">{t('Tournament.groups.dialog.180_count')}</Label>
                  <Input
                    id="p1-180s"
                    type="number"
                    max="50"
                    value={player1Stats.oneEightiesCount || 0}
                    onChange={(e) => setPlayer1Stats(prev => ({
                      ...prev,
                      oneEightiesCount: parseInt(e.target.value) || 0
                    }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="p1-checkout">{t('Tournament.groups.dialog.highest_checkout')}</Label>
                  <Input
                    id="p1-checkout"
                    type="number"
                    max="170"
                    value={player1Stats.highestCheckout || 0}
                    onChange={(e) => setPlayer1Stats(prev => ({
                      ...prev,
                      highestCheckout: parseInt(e.target.value) || 0
                    }))}
                  />
                </div>
              </div>

              {/* Player 2 Stats */}
              <div className="space-y-4">
                <h5 className="font-bold text-lg text-primary">{selectedMatch.player2?.playerId?.name}</h5>
                
                <div className="space-y-2">
                  <Label htmlFor="p2-legs">{t('Tournament.groups.dialog.won_legs')}</Label>
                  <Input
                    id="p2-legs"
                    type="number"
                    max="10"
                    value={player2Legs}
                    onChange={(e) => setPlayer2Legs(parseInt(e.target.value) || 0)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="p2-180s">{t('Tournament.groups.dialog.180_count')}</Label>
                  <Input
                    id="p2-180s"
                    type="number"
                    max="50"
                    value={player2Stats.oneEightiesCount || 0}
                    onChange={(e) => setPlayer2Stats(prev => ({
                      ...prev,
                      oneEightiesCount: parseInt(e.target.value) || 0
                    }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="p2-checkout">{t('Tournament.groups.dialog.highest_checkout')}</Label>
                  <Input
                    id="p2-checkout"
                    type="number"
                    max="170"
                    value={player2Stats.highestCheckout || 0}
                    onChange={(e) => setPlayer2Stats(prev => ({
                      ...prev,
                      highestCheckout: parseInt(e.target.value) || 0
                    }))}
                  />
                </div>
              </div>
            </div>
          )}
            
          <DialogFooter>
            <Button
              variant="success"
              onClick={handleSaveMatch}
              disabled={loading || player1Legs === player2Legs}
            >
              {loading ? t('Tournament.groups.dialog.saving') : t('Tournament.groups.dialog.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Legs View Modal */}
      <LegsViewModal
        isOpen={showLegsModal}
        onClose={() => {
          setShowLegsModal(false);
          setSelectedMatchForLegs(null);
        }}
        match={selectedMatchForLegs}
      />
    </div>
  );
};

export default TournamentGroupsView;