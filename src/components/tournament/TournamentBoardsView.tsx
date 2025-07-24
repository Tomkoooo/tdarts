import React from 'react';

interface TournamentBoardsViewProps {
  tournament: any;
}

const TournamentBoardsView: React.FC<TournamentBoardsViewProps> = ({ tournament }) => {
  const boards = tournament?.clubId?.boards || [];
  // Build a map of all matches by _id for quick lookup
  const allMatches: Record<string, any> = {};
  (tournament.groups || []).forEach((group: any) => {
    (group.matches || []).forEach((match: any) => {
      if (match && match._id) {
        allMatches[match._id.toString()] = match;
      }
    });
  });

  return (
    <div className="mb-4">
      <h2 className="text-xl font-semibold mb-2">Táblák</h2>
      {boards.map((board: any, idx: number) => {
        // Find the next match object if nextMatch is set
        let nextMatch = null;
        if (board.nextMatch && allMatches[board.nextMatch.toString()]) {
          nextMatch = allMatches[board.nextMatch.toString()];
        }
        return (
          <div key={board.boardNumber || idx} className="mb-4 p-3 border rounded">
            <div className="font-semibold">Tábla #{board.boardNumber} {board.name ? `- ${board.name}` : ''}</div>
            <div>Státusz: {board.status}</div>
            {/* Next match info (unless idle) */}
            {board.status !== 'idle' && (
              <div className="mt-2">
                <div className="font-semibold">Következő meccs:</div>
                {nextMatch ? (
                  <div>
                    <div>
                      {nextMatch.player1?.playerId?.name || 'N/A'} vs. {nextMatch.player2?.playerId?.name || 'N/A'}
                    </div>
                    <div>Meccs státusz: {nextMatch.status}</div>
                  </div>
                ) : (
                  <div className="text-base-content/60">Nincs következő meccs.</div>
                )}
              </div>
            )}
            {/* Current match info */}
            {board.currentMatch ? (
              <div className="mt-2">
                <div>
                  <span className="font-semibold">Meccs:</span> {board.currentMatch.player1?.playerId?.name || 'N/A'} vs. {board.currentMatch.player2?.playerId?.name || 'N/A'}
                </div>
                <div>Állás: {board.currentMatch.player1?.legsWon ?? 0} - {board.currentMatch.player2?.legsWon ?? 0}</div>
                <div>Meccs státusz: {board.currentMatch.status}</div>
              </div>
            ) : (
              <div className="text-base-content/60">Nincs aktuális meccs ezen a táblán.</div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default TournamentBoardsView; 