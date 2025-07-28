import React from 'react';

interface TournamentBoardsViewProps {
  tournament: any;
}

const TournamentBoardsView: React.FC<TournamentBoardsViewProps> = ({ tournament }) => {
  const boards = tournament?.clubId?.boards || [];

  return (
    <div className="mt-6">
      <h2 className="text-xl font-bold">Táblák</h2>
      {boards.length === 0 ? (
        <p>Nincsenek még táblák konfigurálva.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {boards.map((board: any, idx: number) => {
            return (
              <div key={board.boardNumber || idx} className="card bg-base-200 shadow-md">
                <div className="card-body">
                  <h3 className="card-title">Tábla {board.boardNumber} {board.name ? `- ${board.name}` : ''}</h3>
                  <p
                    className={`text-lg font-bold ${
                      board.status === "idle"
                        ? "text-gray-500"
                        : board.status === "waiting"
                        ? "text-warning"
                        : board.status === "playing"
                        ? "text-success"
                        : "text-gray-500"
                    }`}
                  >
                    Állapot:{" "}
                    {board.status === "idle"
                      ? "Üres"
                      : board.status === "waiting"
                      ? "Várakozik"
                      : board.status === "playing"
                      ? "Játékban"
                      : "Ismeretlen"}
                  </p>
                  
                  {board.status === "playing" && board.currentMatch ? (
                    <div className="mt-2">
                      <h4 className="font-semibold">Jelenlegi mérkőzés:</h4>
                      <p className="text-md">
                        <span className="font-bold">
                          {board.currentMatch.player1?.playerId?.name || 'N/A'}
                        </span> vs{" "}
                        <span className="font-bold">
                          {board.currentMatch.player2?.playerId?.name || 'N/A'}
                        </span>
                      </p>
                      <p className="text-md">
                        Állás:{" "}
                        <span className="font-bold">
                          {board.currentMatch.player1?.legsWon ?? 0} - {board.currentMatch.player2?.legsWon ?? 0}
                        </span>
                      </p>
                      <p className="text-md">
                        Eredményíró:{" "}
                        <span className="font-bold">
                          {board.currentMatch.scorer?.name || "Nincs"}
                        </span>
                      </p>
                    </div>
                  ) : board.status === "waiting" && board.nextMatch ? (
                    <div className="mt-2">
                      <h4 className="font-semibold">Következő mérkőzés:</h4>
                      <p className="text-md">
                        <span className="font-bold">
                          {board.nextMatch.player1?.playerId?.name || 'N/A'}
                        </span> vs{" "}
                        <span className="font-bold">
                          {board.nextMatch.player2?.playerId?.name || 'N/A'}
                        </span>
                      </p>
                      <p className="text-md">
                        Eredményíró:{" "}
                        <span className="font-bold">
                          {board.nextMatch.scorer?.name || "Nincs"}
                        </span>
                      </p>
                    </div>
                  ) : (
                    <p className="text-md italic">Nincs további információ.</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TournamentBoardsView; 