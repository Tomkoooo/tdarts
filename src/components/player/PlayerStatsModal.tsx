import React from 'react';
import { Player } from '@/interface/player.interface';
import { IconTrophy } from '@tabler/icons-react';

interface PlayerStatsModalProps {
  player: Player | null;
  onClose: () => void;
}

const PlayerStatsModal: React.FC<PlayerStatsModalProps> = ({ player, onClose }) => {
  if (!player) return null;

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-4xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-lg">{player.name} - Részletes Statisztikák</h3>
          <button className="btn btn-sm btn-circle btn-ghost" onClick={onClose}>✕</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Overall Statistics */}
          <div>
            <h4 className="font-bold text-md mb-3">Összesített Statisztikák</h4>
            <div className="space-y-2 text-sm">
              <StatRow label="Tornák" value={player.stats?.tournamentsPlayed || 0} />
              <StatRow label="Legjobb helyezés" value={player.stats?.bestPosition || 'N/A'} />
              <StatRow label="Átlagos helyezés" value={player.stats?.averagePosition ? player.stats.averagePosition.toFixed(1) : 'N/A'} />
              <StatRow label="Meccsek" value={player.stats?.matchesPlayed || 0} />
              <StatRow label="Győzelmek" value={player.stats?.totalMatchesWon || 0} />
              <StatRow label="Vereségek" value={player.stats?.totalMatchesLost || 0} />
              <StatRow label="Legek" value={player.stats?.legsWon || 0} />
              <StatRow label="180-ak" value={player.stats?.total180s || 0} />
              <StatRow label="Legmagasabb kiszálló" value={player.stats?.highestCheckout || 'N/A'} />
              <StatRow label="Átlag" value={player.stats?.avg ? player.stats.avg.toFixed(1) : 'N/A'} />
            </div>
          </div>

          {/* Tournament History */}
          <div>
            <h4 className="font-bold text-md mb-3">Torna Történet</h4>
            {player.tournamentHistory && player.tournamentHistory.length > 0 ? (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {player.tournamentHistory.map((history, index) => (
                  <div key={index} className="p-3 bg-base-200 rounded-lg">
                    <div className="font-semibold text-sm flex justify-between">
                      <span>{history.tournamentName}</span>
                      <span className="text-xs text-base-content/60">{new Date(history.date).toLocaleDateString('hu-HU')}</span>
                    </div>
                    <div className="text-xs text-base-content/70 mt-1">
                      <div className="flex items-center gap-2">
                        <IconTrophy size={14} className="text-warning" />
                        <span>{history.position}. helyezés ({history.eliminatedIn})</span>
                      </div>
                      <div className="divider my-1"></div>
                      <StatRow label="Meccsek" value={`${history.stats.matchesWon} nyert / ${history.stats.matchesLost} vesztett`} />
                      <StatRow label="Legek" value={`${history.stats.legsWon} nyert / ${history.stats.legsLost} vesztett`} />
                      <StatRow label="Átlag" value={history.stats.average ? history.stats.average.toFixed(1) : 'N/A'} />
                      <StatRow label="180-ak" value={history.stats.oneEightiesCount} />
                      <StatRow label="Legmagasabb kiszálló" value={history.stats.highestCheckout} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-base-content/70">Nincs torna történet</p>
            )}
          </div>
        </div>

        <div className="modal-action">
          <button className="btn" onClick={onClose}>Bezárás</button>
        </div>
      </div>
    </div>
  );
};

const StatRow: React.FC<{ label: string; value: string | number }> = ({ label, value }) => (
  <div className="flex justify-between">
    <span>{label}:</span>
    <span className="font-semibold">{value}</span>
  </div>
);

export default PlayerStatsModal; 