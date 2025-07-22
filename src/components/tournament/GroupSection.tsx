import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Tournament, TournamentGroup, Match, PlayerDocument } from '@/interface/tournament.interface';
import { Spinner } from '../ui/Spinner';

interface GroupSectionProps {
  tournamentId: string;
}

export default function GroupSection({ tournamentId }: GroupSectionProps) {
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [groupStandings, setGroupStandings] = useState<{ [groupId: string]: any[] }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTournament = async () => {
      setLoading(true);
      try {
        const { data } = await axios.get<Tournament>(`/api/tournaments/${tournamentId}`);
        setTournament(data);
        setLoading(false);
      } catch (e: any) {
        setError('Nem sikerült betölteni a tornát.');
        setLoading(false);
      }
    };
    fetchTournament();
  }, [tournamentId]);

  useEffect(() => {
    const fetchStandings = async () => {
      if (!tournament) return;
      try {
        const { data } = await axios.get(`/api/tournaments/${tournamentId}/group-standings`);
        setGroupStandings(data); // { [groupId]: GroupStanding[] }
      } catch (e) {
        setGroupStandings({});
      }
    };
    fetchStandings();
  }, [tournament]);

  if (loading) return <Spinner />;
  if (error) return <div className="text-error">{error}</div>;
  if (!tournament) return null;

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold mb-4">Csoportok</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {tournament.groups.map((group: TournamentGroup) => (
          <div key={group.id} className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold">{group.id} (Tábla: {group.board})</h3>
                      </div>
            <div className="mb-2">
              <h4 className="font-medium mb-1">Állás</h4>
              <table className="w-full text-sm border">
                        <thead>
                  <tr className="bg-gray-100">
                    <th className="p-1">#</th>
                    <th className="p-1">Játékos</th>
                    <th className="p-1">Pont</th>
                    <th className="p-1">Legs+</th>
                    <th className="p-1">Legs-</th>
                    <th className="p-1">Átlag</th>
                          </tr>
                        </thead>
                        <tbody>
                  {groupStandings[group.id]?.map((standing, idx) => (
                    <tr key={standing.playerId} className={idx === 0 ? 'bg-green-50 font-bold' : ''}>
                      <td className="p-1 text-center">{standing.rank}</td>
                      <td className="p-1">{standing.playerName || standing.playerId}</td>
                      <td className="p-1 text-center">{standing.points}</td>
                      <td className="p-1 text-center">{standing.legsWon}</td>
                      <td className="p-1 text-center">{standing.legsLost}</td>
                      <td className="p-1 text-center">{standing.average?.toFixed(2) ?? '-'}</td>
                                        </tr>
                                      ))}
                                  </tbody>
                                </table>
                              </div>
            <div>
              <h4 className="font-medium mb-1">Meccsek</h4>
              <GroupMatches group={group} />
                    </div>
                  </div>
        ))}
                          </div>
                        </div>
  );
}

// Helper komponens a csoport meccsekhez
function GroupMatches({ group }: { group: TournamentGroup }) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMatches = async () => {
      setLoading(true);
      try {
        const { data } = await axios.get(`/api/matches?ids=${group.matches.join(',')}`);
        setMatches(data.matches);
      } catch (e) {
        setMatches([]);
      } finally {
        setLoading(false);
      }
    };
    fetchMatches();
  }, [group.matches]);

  if (loading) return <div className="text-muted">Meccsek betöltése...</div>;
  if (!matches.length) return <div className="text-muted">Nincs meccs ebben a csoportban.</div>;

                                    return (
    <table className="w-full text-xs border mt-2">
      <thead>
        <tr className="bg-gray-50">
          <th className="p-1">Játékos 1</th>
          <th className="p-1">Játékos 2</th>
          <th className="p-1">Eredmény</th>
          <th className="p-1">Státusz</th>
                                      </tr>
      </thead>
      <tbody>
        {matches.map(match => (
          <tr key={match._id}>
            <td className="p-1">{match.player1?.name || match.player1?.playerId}</td>
            <td className="p-1">{match.player2?.name || match.player2?.playerId}</td>
            <td className="p-1 text-center">
              {match.player1?.legsWon} - {match.player2?.legsWon}
            </td>
            <td className="p-1 text-center">{match.status}</td>
                                </tr>
        ))}
                            </tbody>
                          </table>
  );
}