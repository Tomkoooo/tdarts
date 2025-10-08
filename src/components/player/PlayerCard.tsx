import React from 'react';
import { Player } from '@/interface/player.interface';
import { IconChevronRight } from '@tabler/icons-react';

interface PlayerCardProps {
  player: Player;
  onClick: () => void;
  rank?: number;
}

const PlayerCard: React.FC<PlayerCardProps> = ({ player, onClick, rank }) => {
  // Safely get MMR with fallback to base MMR (800)
  const mmr = (player as any).mmr ?? player.stats?.mmr ?? 800;
  
  // Safely get MMR tier with fallback
  const mmrTier = (player as any).mmrTier ?? (() => {
    if (mmr >= 1600) return { name: 'Elit', color: 'text-error' };
    if (mmr >= 1400) return { name: 'Mester', color: 'text-warning' };
    if (mmr >= 1200) return { name: 'Haladó', color: 'text-info' };
    if (mmr >= 1000) return { name: 'Középhaladó', color: 'text-success' };
    if (mmr >= 800) return { name: 'Kezdő+', color: 'text-primary' };
    return { name: 'Kezdő', color: 'text-base-content' };
  })();
  
  return (
    <div 
      className="card bg-base-100 shadow-lg hover:shadow-xl transition-all cursor-pointer hover:scale-[1.02]"
      onClick={onClick}
    >
      <div className="card-body p-4 sm:p-5">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
            {rank && (
              <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary/10 flex-shrink-0">
                <span className="text-sm sm:text-base font-bold text-primary">#{rank}</span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h2 className="card-title text-sm sm:text-base md:text-lg truncate mb-1" title={player.name}>
                {player.name}
              </h2>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-base-content/60">
                  {player.stats?.tournamentsPlayed || 0} torna
                </span>
                {/* MMR Badge */}
                <div className={`badge badge-sm ${mmrTier.color} gap-1`}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                  <span className="text-xs font-bold">{mmr}</span>
                </div>
              </div>
            </div>
          </div>
          <IconChevronRight className="text-base-content/50 flex-shrink-0" size={20} />
        </div>
        
        {/* MMR Tier Display */}
        <div className="mb-3">
          <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full bg-base-200 ${mmrTier.color}`}>
            <span className="text-xs font-semibold">{mmrTier.name}</span>
          </div>
        </div>
        
        <div className="divider my-2"></div>
        
        <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs sm:text-sm">
          <div className="flex justify-between">
            <span className="font-semibold text-base-content/70">Átlag:</span>
            <span className="font-bold">{player.stats?.avg?.toFixed(1) || 'N/A'}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-semibold text-base-content/70">180s:</span>
            <span className="font-bold">{player.stats?.total180s || 0}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-semibold text-base-content/70">Legjobb:</span>
            <span className="font-bold">{player.stats?.bestPosition || 'N/A'}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-semibold text-base-content/70">Max kiszálló:</span>
            <span className="font-bold">{player.stats?.highestCheckout || 'N/A'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlayerCard; 