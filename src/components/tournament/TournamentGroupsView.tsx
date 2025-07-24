import React from 'react';

interface TournamentGroupsViewProps {
  tournament: any;
}

const TournamentGroupsView: React.FC<TournamentGroupsViewProps> = ({ tournament }) => {
  if (!tournament.groups || tournament.groups.length === 0) {
    return <div className="mb-4">Nincsenek csoportok generálva.</div>;
  }
  return (
    <div className="mb-4">
      <h2 className="text-xl font-semibold mb-2">Csoportok</h2>
      {tournament.groups.map((group: any, idx: number) => {
        // Get players in this group, sorted by groupOrdinalNumber
        const groupPlayers = (tournament.tournamentPlayers || [])
          .filter((p: any) => p.groupId && group._id && p.groupId.toString() === group._id.toString())
          .sort((a: any, b: any) => (a.groupOrdinalNumber ?? 0) - (b.groupOrdinalNumber ?? 0));
        return (
          <div key={group._id || idx} className="mb-6 p-3 border rounded">
            <div className="font-semibold mb-2">Tábla: {group.board}</div>
            <div className="mb-2">
              <table className="table-auto w-full text-sm mb-2">
                <thead>
                  <tr>
                    <th className="text-left">#</th>
                    <th className="text-left">Név</th>
                    <th className="text-left">Csoport helyezés</th>
                  </tr>
                </thead>
                <tbody>
                  {groupPlayers.map((player: any, i: number) => (
                    <tr key={player._id || i}>
                      <td>{player.groupOrdinalNumber + 1}</td>
                      <td>{player.playerReference?.name || player.playerReference || player._id}</td>
                      <td>{player.groupStanding ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mb-2 font-semibold">Meccsek</div>
            {group.matches && group.matches.length > 0 ? (
              <ul className="space-y-1">
                {group.matches.map((match: any, mIdx: number) => (
                  <li key={match._id || mIdx} className="text-sm">
                    <span className="font-semibold">Meccs:</span> 
                    {match.player1?.playerId?.name || match.player1?.playerId || 'N/A'} vs. {match.player2?.playerId?.name || match.player2?.playerId || 'N/A'}
                    {' '}<span className="ml-2">Író: {match.scorer?.name || match.scorer || 'N/A'}</span>
                    {' '}<span className="ml-2">Állapot: {match.status}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-base-content/60">Nincsenek meccsek ebben a csoportban.</div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default TournamentGroupsView; 