import React from 'react';
import { Player } from '@/interface/player.interface';
import { IconChevronRight } from '@tabler/icons-react';

interface PlayerCardProps {
  player: Player;
  onClick: () => void;
  rank?: number;
}

const PlayerCard: React.FC<PlayerCardProps> = ({ player, onClick, rank }) => {
  return (
    <div 
      className="card bg-base-100 shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <div className="card-body">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {rank && <span className="text-2xl font-bold text-primary">#{rank}</span>}
            <div>
              <h2 className="card-title text-lg">{player.name}</h2>
              <div className="text-xs text-base-content/60">
                {player.stats?.tournamentsPlayed || 0} torna
              </div>
            </div>
          </div>
          <IconChevronRight className="text-base-content/50" />
        </div>
        <div className="divider my-2"></div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <div>
            <span className="font-semibold">Átlag:</span>
            <span className="float-right">{player.stats?.avg?.toFixed(1) || 'N/A'}</span>
          </div>
          <div>
            <span className="font-semibold">180s:</span>
            <span className="float-right">{player.stats?.total180s || 0}</span>
          </div>
          <div>
            <span className="font-semibold">Legjobb helyezés:</span>
            <span className="float-right">{player.stats?.bestPosition || 'N/A'}</span>
          </div>
          <div>
            <span className="font-semibold">Legmagasabb kiszálló:</span>
            <span className="float-right">{player.stats?.highestCheckout || 'N/A'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlayerCard; 