import React, { useState, useEffect } from 'react';
import { IconTrophy, IconClock, IconChartBar, IconSword, IconTarget, IconLoader2, IconAlertCircle } from '@tabler/icons-react';
import { Button } from '@/components/ui/Button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

interface Throw {
  score: number;
  darts: number;
  isDouble: boolean;
  isCheckout: boolean;
}

interface Leg {
  player1Score: number;
  player2Score: number;
  player1Throws: Throw[];
  player2Throws: Throw[];
  winnerId: {
    _id: string;
    name: string;
  };
  checkoutScore?: number;
  checkoutDarts?: number;
  winnerArrowCount?: number;
  loserRemainingScore?: number;
  doubleAttempts: number;
  createdAt: string;
}

interface Match {
  _id: string;
  player1: {
    legsWon: number;
    playerId: {
      _id: string;
      name: string;
    };
  };
  player2: {
    legsWon: number;
    playerId: {
      _id: string;
      name: string;
    };
  };
  winnerId?: string;
  status: string;
  legs?: Leg[];
  createdAt: string;
  round?: string;
  groupName?: string;
  average?: number;
  checkout?: string;
}

interface PlayerMatchesModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerId: string;
  playerName: string;
  tournamentCode: string;
  onShowDetailedStats?: (matchId: string) => void;
}

const PlayerMatchesModal: React.FC<PlayerMatchesModalProps> = ({ 
  isOpen, 
  onClose, 
  playerId, 
  playerName, 
  tournamentCode,
  onShowDetailedStats,
}) => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && playerId && tournamentCode) {
      fetchPlayerMatches();
    } else if (isOpen && (!playerId || !tournamentCode)) {
      setError('Hiányzó játékos azonosító vagy torna kód');
      setLoading(false);
    }
  }, [isOpen, playerId, tournamentCode]);

  const fetchPlayerMatches = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/tournaments/${tournamentCode}/player-matches/${playerId}`);
      if (!response.ok) {
        throw new Error('Nem sikerült betölteni a meccseket');
      }

      const data = await response.json();
      if (data.success) {
        setMatches(data.matches || []);
      } else {
        setError(data.error || 'Nem sikerült betölteni a meccseket');
      }
    } catch (err) {
      setError('Hiba történt a meccsek betöltése során');
      console.error('Fetch player matches error:', err);
    } finally {
      setLoading(false);
    }
  };

  const wins = matches.filter(m => m.winnerId === playerId).length;
  const losses = matches.filter(m => m.winnerId !== playerId && m.status === 'finished').length;
  const winRate = matches.length > 0 ? Math.round((wins / matches.length) * 100) : 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => (!open ? onClose() : null)}>
      <DialogContent className="flex h-[90vh] max-w-4xl flex-col overflow-hidden bg-background p-0 shadow-2xl border-muted/20 sm:rounded-2xl">
        {/* Header */}
        <header className="relative flex flex-col gap-5 px-6 py-6 sm:flex-row sm:items-center sm:justify-between border-b border-muted/10">
          <div className="space-y-3">
            <DialogHeader className="p-0 text-left">
              <DialogTitle className="text-3xl font-black text-foreground tracking-tighter uppercase leading-none">
                {playerName}
              </DialogTitle>
            </DialogHeader>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="text-[9px] font-black h-5 px-2 bg-primary/5 text-primary border-primary/20 uppercase tracking-tighter">
                Esemény Meccsei
              </Badge>
              <Badge variant="outline" className="text-[9px] font-black h-5 px-2 uppercase tracking-widest opacity-40">
                {tournamentCode}
              </Badge>
            </div>
          </div>
          <div className="flex flex-col items-end">
            <Badge variant="outline" className="rounded-lg border-primary/20 bg-primary/5 px-4 py-2 text-base font-black text-primary gap-2 shadow-sm">
              <IconSword size={18} />
              {matches.length} lejátszott meccs
            </Badge>
          </div>
        </header>

        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center space-y-4">
            <IconLoader2 size={48} className="animate-spin text-primary/50" />
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em]">Meccsek betöltése...</p>
          </div>
        ) : error ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-rose-500/10 flex items-center justify-center">
              <IconAlertCircle size={32} className="text-rose-500" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-foreground">Hiba történt</p>
              <p className="text-xs text-muted-foreground max-w-xs">{error}</p>
            </div>
            <Button variant="outline" size="sm" onClick={fetchPlayerMatches}>Újrapróbálás</Button>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-6 pb-8 pt-6 space-y-8 custom-scrollbar">
            {/* Quick Stats Summary */}
            <section className="grid gap-3 grid-cols-2 sm:grid-cols-3">
              <StatCard label="Győzelmek" value={wins} icon={<IconTrophy size={14} />} variant="amber" />
              <StatCard label="Vereségek" value={losses} icon={<IconSword size={14} />} variant="rose" />
              <StatCard label="Győzelmi Arány" value={`${winRate}%`} icon={<IconTarget size={14} />} variant="primary" />
            </section>

            {/* Match List */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Mérkőzések Listája</h3>
              </div>

              <div className="grid gap-4">
                {matches.length > 0 ? matches.map((match, matchIndex) => {
                  const isPlayerWinner = match.winnerId === playerId;
                  const isPlayer1 = playerId === match.player1?.playerId?._id;
                  const opponent = isPlayer1 ? match.player2 : match.player1;
                  
                  return (
                    <Card key={match._id} className="bg-card border-muted/10 overflow-hidden hover:border-primary/20 transition-all">
                      <CardContent className="p-0">
                        <div className="flex flex-col sm:flex-row items-stretch">
                          {/* Result Indicator */}
                          <div className={cn(
                            "w-full sm:w-1.5 min-h-[4px] sm:min-h-full",
                            match.status !== 'finished' ? "bg-amber-500" : (isPlayerWinner ? "bg-emerald-500" : "bg-rose-500")
                          )} />
                          
                          <div className="flex-1 p-4 sm:p-5 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                            <div className="space-y-2 flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-[10px] font-black text-muted-foreground/40 uppercase">#{matchIndex + 1}</span>
                                {match.groupName && (
                                  <Badge variant="secondary" className="text-[9px] font-bold bg-primary/5 text-primary border-primary/10 px-1.5 h-4.5">
                                    {match.groupName}
                                  </Badge>
                                )}
                                {match.round && (
                                  <Badge variant="secondary" className="text-[9px] font-bold bg-muted text-muted-foreground px-1.5 h-4.5">
                                    {match.round}
                                  </Badge>
                                )}
                              </div>
                              
                              <div className="flex items-center gap-3">
                                <h4 className="text-base font-black truncate tracking-tight uppercase">vs {opponent?.playerId?.name}</h4>
                                <div className="text-lg font-black font-mono tracking-tighter shrink-0 text-primary bg-primary/5 px-2 rounded">
                                  {isPlayer1 ? `${match.player1?.legsWon}-${match.player2?.legsWon}` : `${match.player2?.legsWon}-${match.player1?.legsWon}`}
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-3 text-[10px] font-bold text-muted-foreground uppercase opacity-60">
                                <span className="flex items-center gap-1">
                                  <IconClock size={10} />
                                  {new Date(match.createdAt).toLocaleDateString('hu-HU')}
                                </span>
                                {match.status === 'finished' ? (
                                  <span className={cn(isPlayerWinner ? "text-emerald-500" : "text-rose-500")}>
                                    {isPlayerWinner ? "Győzelem" : "Vereség"}
                                  </span>
                                ) : (
                                  <span className="text-amber-500">Folyamatban</span>
                                )}
                              </div>
                            </div>

                            <div className="flex flex-col sm:items-end gap-3 w-full sm:w-auto">
                              <div className="flex gap-4 sm:justify-end">
                                <div className="text-center">
                                  <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">Átlag</p>
                                  <p className="text-sm font-black">{match.average ? match.average.toFixed(1) : "—"}</p>
                                </div>
                                <div className="text-center">
                                  <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">Kiszálló</p>
                                  <p className="text-sm font-black">{match.checkout || "—"}</p>
                                </div>
                              </div>
                              
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="text-[9px] font-black h-8 px-3 tracking-widest uppercase gap-1.5 border-muted/20 hover:bg-primary/5 hover:text-primary hover:border-primary/30"
                                onClick={() => onShowDetailedStats && onShowDetailedStats(match._id)}
                                disabled={!match.legs || match.legs.length === 0}
                              >
                                <IconChartBar size={12} />
                                Részletek
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                }) : (
                  <div className="p-12 text-center border border-dashed border-muted/20 rounded-xl">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground/30 tracking-widest text-center">Nincs mérkőzés adat</p>
                  </div>
                )}
              </div>
            </section>
          </div>
        )}
        
        <div className="p-6 border-t border-muted/10 bg-muted/5 flex justify-end">
          <Button onClick={onClose} variant="secondary" className="text-[10px] font-black uppercase tracking-widest px-8">
            Bezárás
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

function StatCard({ label, value, icon, variant }: { label: string, value: string | number, icon: React.ReactNode, variant: 'primary' | 'rose' | 'amber' }) {
  const variants = {
    primary: "border-primary/20 bg-primary/5 text-primary",
    rose: "border-rose-500/20 bg-rose-500/5 text-rose-600",
    amber: "border-amber-500/20 bg-amber-500/5 text-amber-600",
  };
  
  return (
    <div className={cn("p-4 rounded-xl border transition-all", variants[variant])}>
      <div className="flex items-center justify-between mb-2 opacity-70">
        <span className="text-[9px] font-black uppercase tracking-widest">{label}</span>
        {icon}
      </div>
      <div className="text-xl font-black tracking-tighter">{value}</div>
    </div>
  );
}

export default PlayerMatchesModal;
