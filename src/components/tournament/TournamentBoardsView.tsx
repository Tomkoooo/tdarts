import React from 'react';

interface TournamentBoardsViewProps {
  tournament: any;
}

const TournamentBoardsView: React.FC<TournamentBoardsViewProps> = ({ tournament }) => {
  const boards = tournament?.clubId?.boards || [];

  return (
    <div className="mb-4">
      <h2 className="text-xl font-semibold mb-2">Táblák</h2>
      {boards.map((board: any, idx: number) => {
        return (
          <div key={board.boardNumber || idx} className="mb-4 p-3 border rounded">
            <div className="font-semibold">Tábla #{board.boardNumber} {board.name ? `- ${board.name}` : ''}</div>
            <div>Státusz: {board.status}</div>
            
            {/* Current match info */}
            {board.currentMatch ? (
              <div className="mt-2">
                <div className="font-semibold">Aktuális meccs:</div>
                <div>
                  {board.currentMatch.player1?.playerId?.name || 'N/A'} vs. {board.currentMatch.player2?.playerId?.name || 'N/A'}
                </div>
                <div>Állás: {board.currentMatch.player1?.legsWon ?? 0} - {board.currentMatch.player2?.legsWon ?? 0}</div>
                <div>Meccs státusz: {board.currentMatch.status}</div>
                {board.currentMatch.scorer && (
                  <div>Író: {board.currentMatch.scorer.name || 'N/A'}</div>
                )}
              </div>
            ) : (
              <div className="text-base-content/60">Nincs aktuális meccs ezen a táblán.</div>
            )}
            
            {/* Next match info (unless idle) */}
            {board.status !== 'idle' && board.nextMatch && (
              <div className="mt-2">
                <div className="font-semibold">Következő meccs:</div>
                <div>
                  {board.nextMatch.player1?.playerId?.name || 'N/A'} vs. {board.nextMatch.player2?.playerId?.name || 'N/A'}
                </div>
                <div>Meccs státusz: {board.nextMatch.status}</div>
                {board.nextMatch.scorer && (
                  <div>Író: {board.nextMatch.scorer.name || 'N/A'}</div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default TournamentBoardsView; 