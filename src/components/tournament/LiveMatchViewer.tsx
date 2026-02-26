"use client";

import { useEffect, useState } from 'react';
import { useSocket } from '@/hooks/useSocket';
import { getMatchState } from '@/lib/socketApi';
import { IconEye, IconArrowLeft, IconPencil, IconShare } from '@tabler/icons-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';

interface LiveMatchViewerProps {
  matchId: string;
  tournamentCode: string;
  player1: any;
  player2: any;
  onBack?: () => void;
  onShare?: () => void;
}

interface Throw {
  score: number;
  darts: number;
  isDouble: boolean;
  isCheckout: boolean;
  remainingScore?: number;
  timestamp?: number;
  playerId?: string;
}

interface MatchState {
  currentLeg: number;
  completedLegs: any[];
  currentLegData: {
    player1Score: number;
    player2Score: number;
    player1Throws: Throw[];
    player2Throws: Throw[];
    player1Remaining: number;
    player2Remaining: number;
    player1Id?: string;
    player2Id?: string;
    currentPlayer: number; // 1 or 2
  };
  player1LegsWon?: number;
  player2LegsWon?: number;
  legsToWin?: number;
}

interface MatchData {
  _id: string;
  player1: any;
  player2: any;
  legsToWin: number;
  startingPlayer: number;
  status: string;
  winnerId?: string;
  legs: any[];
}

const LiveMatchViewer: React.FC<LiveMatchViewerProps> = ({ matchId, tournamentCode, player1, player2, onBack, onShare }) => {
  const tTour = useTranslations('Tournament')
  const t = (key: string, values?: any) => tTour(`live_viewer.${key}`, values);
  
  const [matchState, setMatchState] = useState<MatchState>({
    currentLeg: 1,
    completedLegs: [],
    currentLegData: {
      player1Score: 501,
      player2Score: 501,
      player1Throws: [],
      player2Throws: [],
      player1Remaining: 501,
      player2Remaining: 501,
      currentPlayer: 1
    },
    player1LegsWon: 0,
    player2LegsWon: 0,
    legsToWin: 3
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [currentPlayer1, setCurrentPlayer1] = useState(player1);
  const [currentPlayer2, setCurrentPlayer2] = useState(player2);
  const [matchData, setMatchData] = useState<MatchData | null>(null);

  const { socket } = useSocket({ 
    tournamentId: tournamentCode, 
    matchId: matchId 
  });

  useEffect(() => {
    if (matchState) {
      (window as any).matchState = matchState;
    }
  }, [matchState]);

  useEffect(() => {
    if (matchData) {
      (window as any).matchData = matchData;
    }
  }, [matchData]);

  const fetchMatchData = async () => {
    try {
      const response = await fetch(`/api/matches/${matchId}`);
      const data = await response.json();
      
      if (data.success && data.match) {
        setMatchData(data.match);
        if (data.match.player1?.playerId?.name) setCurrentPlayer1(data.match.player1.playerId);
        if (data.match.player2?.playerId?.name) setCurrentPlayer2(data.match.player2.playerId);
        
        const dbPlayer1LegsWon = data.match.player1?.legsWon || 0;
        const dbPlayer2LegsWon = data.match.player2?.legsWon || 0;
        
        setMatchState(prev => ({
          ...prev,
          player1LegsWon: dbPlayer1LegsWon,
          player2LegsWon: dbPlayer2LegsWon,
          legsToWin: data.match.legsToWin || 3,
          currentLeg: dbPlayer1LegsWon + dbPlayer2LegsWon + 1,
          completedLegs: data.match.legs || []
        }));
      }
    } catch (error) {
      console.error('Failed to fetch match data:', error);
    }
  };

  useEffect(() => {
    setCurrentPlayer1(player1);
    setCurrentPlayer2(player2);
  }, [player1, player2]);

  useEffect(() => {
    fetchMatchData();
    if (socket.connected) {
      socket.emit('join-tournament', tournamentCode);
      socket.emit('join-match', matchId);
    }
    
    getMatchState(matchId)
    .then(data => {
      if (data.success && data.state) {
        setMatchState(prev => ({
          ...prev,
          ...data.state,
          player1LegsWon: prev.player1LegsWon || data.state.player1LegsWon || 0,
          player2LegsWon: prev.player2LegsWon || data.state.player2LegsWon || 0,
          completedLegs: prev.completedLegs.length > 0 ? prev.completedLegs : data.state.completedLegs || []
        }));
      }
      setIsLoading(false);
    })
    .catch(error => {
      console.error('Failed to fetch initial match state:', error);
      setIsLoading(false);
    });
    
    function onMatchState(state: MatchState) {
      setMatchState(prev => ({
        ...prev,
        ...state,
        player1LegsWon: prev.player1LegsWon || state.player1LegsWon || 0,
        player2LegsWon: prev.player2LegsWon || state.player2LegsWon || 0,
        completedLegs: prev.completedLegs.length > 0 ? prev.completedLegs : state.completedLegs || []
      }));
    }

    function onThrowUpdate(data: any) {
      setMatchState(prev => ({
        ...prev,
        currentLegData: {
          ...prev.currentLegData,
          [data.playerId === currentPlayer1?._id ? 'player1Throws' : 'player2Throws']: [
            ...prev.currentLegData[data.playerId === currentPlayer1?._id ? 'player1Throws' : 'player2Throws'],
            {
              score: data.score,
              darts: data.darts,
              isDouble: data.isDouble,
              isCheckout: data.isCheckout,
              remainingScore: data.remainingScore,
              timestamp: Date.now(),
              playerId: data.playerId
            }
          ],
          [data.playerId === currentPlayer1?._id ? 'player1Remaining' : 'player2Remaining']: data.remainingScore,
          currentPlayer: data.playerId === currentPlayer1?._id ? 2 : 1
        }
      }));
    }

    function onLegComplete() {
      fetchMatchData();
    }

    function onFetchMatchData() {
      fetchMatchData();
    }

    socket.on('match-state', onMatchState);
    socket.on('throw-update', onThrowUpdate);
    socket.on('leg-complete', onLegComplete);
    socket.on('fetch-match-data', onFetchMatchData);

    return () => {
      socket.off('match-state', onMatchState);
      socket.off('throw-update', onThrowUpdate);
      socket.off('leg-complete', onLegComplete);
      socket.off('fetch-match-data', onFetchMatchData);
    };
  }, [matchId, tournamentCode, currentPlayer1?._id, currentPlayer2?._id, socket.connected]);

  const getCurrentLegStarter = (): number => {
    if (!matchData) return 1;
    const currentLegNumber = matchState.currentLeg;
    if (currentLegNumber === 1) {
      return matchData.startingPlayer || 1;
    }
     return matchData.startingPlayer === 1 
      ? (currentLegNumber % 2 === 1 ? 1 : 2)
      : (currentLegNumber % 2 === 1 ? 2 : 1);
  };

  const getPlayer1Name = () => currentPlayer1?.name || matchData?.player1?.playerId?.name || 'Player 1';
  const getPlayer2Name = () => currentPlayer2?.name || matchData?.player2?.playerId?.name || 'Player 2';

  const openStreamingPopup = () => {
    const fullscreenWindow = window.open('', '_blank', 'width=1200,height=500,scrollbars=no,resizable=yes');
    if (fullscreenWindow) {
      (window as any).matchState = matchState;
       fullscreenWindow.document.write('<!DOCTYPE html><html><head><title>Stream</title></head><body><h1>Stream Window</h1><p>Check main window for Logic</p></body></html>');
    }
  };

  const renderThrowScore = (t_throw: Throw) => {
    const isHigh = t_throw.score >= 100 && t_throw.score < 140;
    const isVeryHigh = t_throw.score >= 140 && t_throw.score < 180;
    const isMax = t_throw.score === 180;
    
    let className = "font-mono text-base sm:text-lg"; 
    if (isMax) className += " text-yellow-500 font-bold text-xl";
    else if (isVeryHigh) className += " text-red-500 font-bold";
    else if (isHigh) className += " text-green-500 font-bold";
    else className += " text-muted-foreground";

    return (
      <div className={cn("flex flex-col items-center justify-center h-8", isMax && "animate-pulse")}>
        <span className={className}>{t_throw.score}</span>
        {t_throw.isCheckout && (
          <Badge variant="outline" className="text-[10px] h-3 px-1 border-primary text-primary absolute -mt-6 ml-6 bg-background">
            {t("out_1ooe")}</Badge>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="loading loading-spinner loading-lg"></div>
      </div>
    );
  }

  const p1Throws = matchState.currentLegData.player1Throws || [];
  const p2Throws = matchState.currentLegData.player2Throws || [];
  const maxThrows = Math.max(p1Throws.length, p2Throws.length);
  
  // Last 6 rounds, but displayed in chronological order (top to bottom)
  // [1, 2, 3, 4, 5, 6, 7] -> slice(-6) -> [2, 3, 4, 5, 6, 7]
  const historyRows = Array.from({ length: maxThrows }).map((_, i) => ({
    round: i + 1,
    p1: p1Throws[i],
    p2: p2Throws[i]
  })).slice(-6);

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Mobile Header */}
      <div className="flex justify-between items-center p-2 lg:hidden border-b bg-muted/20">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-2 px-2">
          <IconArrowLeft className="w-5 h-5" />
          <span className="font-medium">{t('back')}</span>
        </Button>
        {onShare && (
          <Button variant="ghost" size="icon" onClick={onShare}>
             <IconShare className="w-5 h-5" />
          </Button>
        )}
      </div>

      {/* Desktop Header */}
      <div className="hidden lg:flex justify-end items-center mb-4 gap-2">
        <Button size="sm" variant="secondary" className="gap-2" onClick={openStreamingPopup}>
          <IconEye className="w-4 h-4" />
          {t('streaming_window')}
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 lg:p-0">
        <Card className="max-w-4xl mx-auto overflow-hidden bg-card border-none shadow-none sm:shadow-sm sm:border">
          
          {/* Top Bar: Leg Count & Status */}
          <div className="flex justify-center items-center py-3 bg-muted/30 border-b gap-6 text-sm">
             <div className="flex items-center gap-3">
               <span className="text-muted-foreground uppercase text-xs tracking-wider font-semibold">{t('legs')}</span>
               <div className="flex items-center gap-2 text-xl font-bold font-mono">
                  <span>{matchState.player1LegsWon}</span>
                  <span className="text-muted-foreground/30">-</span>
                  <span>{matchState.player2LegsWon}</span>
               </div>
             </div>
             <div className="w-px h-5 bg-border"></div>
             <div className="flex items-center gap-1 text-xs text-muted-foreground uppercase tracking-wider font-semibold">
               {t("leg_1mum")}{matchState.currentLeg}
             </div>
          </div>

          {/* Main Scoreboard Area - 3 Column Layout */}
          <div className="grid grid-cols-[1fr_auto_1fr] divide-x divide-border">
            
            {/* Player 1 (Left) */}
            <div className={`p-2 sm:p-4 flex flex-col items-center relative transition-colors ${matchState.currentLegData.currentPlayer === 1 ? 'bg-primary/5' : ''}`}>
               {/* Name */}
               <div className="flex items-center gap-1 mb-2 w-full justify-center px-1 max-w-full">
                 {getCurrentLegStarter() === 1 && <IconPencil size={10} className="text-muted-foreground flex-shrink-0" />}
                 <span className="font-bold text-sm sm:text-lg text-center truncate leading-none max-w-full">{getPlayer1Name()}</span>
               </div>
               
               {/* Big Score */}
               <div className="text-4xl sm:text-7xl font-bold tracking-tighter tabular-nums mb-2 sm:mb-4 text-primary leading-none">
                 {matchState.currentLegData.player1Remaining}
               </div>

               {/* Active Dot Indicator - YELLOW for high contrast */}
               {matchState.currentLegData.currentPlayer === 1 && (
                 <div className="w-3 h-3 rounded-full bg-yellow-400" />
               )}
            </div>

            {/* Middle Stats (Center) */}
            <div className="w-12 sm:w-24 bg-muted/5 flex flex-col items-center py-2 sm:py-4 justify-start pt-8 sm:pt-12">
               <div className="text-[9px] sm:text-[10px] uppercase text-muted-foreground tracking-wider font-bold text-center leading-tight mb-1 opacity-70">
                 {t("tdarts_f0pi")}</div>
            </div>

            {/* Player 2 (Right) */}
            <div className={`p-2 sm:p-4 flex flex-col items-center relative transition-colors ${matchState.currentLegData.currentPlayer === 2 ? 'bg-primary/5' : ''}`}>
               {/* Name */}
               <div className="flex items-center gap-1 mb-2 w-full justify-center px-1 max-w-full">
                 <span className="font-bold text-sm sm:text-lg text-center truncate leading-none max-w-full">{getPlayer2Name()}</span>
                 {getCurrentLegStarter() === 2 && <IconPencil size={10} className="text-muted-foreground flex-shrink-0" />}
               </div>
               
               {/* Big Score */}
               <div className="text-4xl sm:text-7xl font-bold tracking-tighter tabular-nums mb-2 sm:mb-4 text-primary leading-none">
                 {matchState.currentLegData.player2Remaining}
               </div>

               {/* Active Dot Indicator - YELLOW for high contrast */}
               {matchState.currentLegData.currentPlayer === 2 && (
                 <div className="w-3 h-3 rounded-full bg-yellow-400" />
               )}
            </div>
          </div>

          {/* History / Recent Throws List */}
          <div className="border-t bg-muted/5 min-h-[150px]">
             <div className="divide-y divide-border/50">
               {historyRows.length > 0 ? (
                 historyRows.map((row, i) => (
                   <div key={i} className="grid grid-cols-[1fr_auto_1fr] items-center py-2 px-2 hover:bg-muted/10 h-10">
                     <div className="text-center w-full">
                       {row.p1 ? renderThrowScore(row.p1) : null}
                     </div>
                     <div className="text-center w-8 flex justify-center text-xs text-muted-foreground/50 font-mono">
                       {row.round}
                     </div>
                     <div className="text-center w-full">
                       {row.p2 ? renderThrowScore(row.p2) : null}
                     </div>
                   </div>
                 ))
               ) : (
                 <div className="py-8 text-center text-muted-foreground text-sm opacity-30 italic">
                   ...
                 </div>
               )}
             </div>
          </div>

        </Card>
      </div>
    </div>
  );
};

export default LiveMatchViewer;