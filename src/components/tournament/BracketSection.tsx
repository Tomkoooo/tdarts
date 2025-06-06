'use client';

import { useMemo } from 'react';
import { Bracket, Seed, SeedItem, SeedTeam, ISeedProps, IRenderSeedProps } from 'react-brackets';
import { Tournament, Match } from '@/components/tournament/TournamentDetailsPage';

interface BracketSectionProps {
  tournament: Tournament;
}

// Define the custom seed type that extends ISeedProps
interface CustomSeed extends ISeedProps {
  id: string | number;
  teams: { name: string; score: number | null }[];
  match: Match;
}

interface CustomSeedProps {
  seed: CustomSeed;
  breakpoint: number;
  roundIndex: number;
  seedIndex: number;
}

const CustomSeed = ({ seed }: CustomSeedProps) => {
  const { teams, match } = seed;
  const [team1, team2] = teams;

  // Determine if match is finished and who won
  const isFinished = match.matchReference?.status === 'finished';
  const isTeam1Winner = team1.score!  > team2.score!;
  const isTeam2Winner = team1.score!  < team2.score!;

  return (
    <Seed className="flex items-center">
      <SeedItem className="border rounded p-2 bg-gray-800">
        <div>
          <SeedTeam
            className={`text-sm ${isTeam1Winner ? 'text-green-500 font-bold' : team1.name === 'TBD' ? 'italic text-gray-300 text-xs' : 'text-white'}`}
          >
            {team1.name} {isFinished && team1.score != null ? `(${team1.score})` : ''}
          </SeedTeam>
          <SeedTeam
            className={`text-sm ${isTeam2Winner ? 'text-green-500 font-bold' : team2.name === 'TBD' ? 'italic text-gray-300 text-xs' : 'text-white'}`}
          >
            {team2.name} {isFinished && team2.score != null ? `(${team2.score})` : ''}
          </SeedTeam>
        </div>
      </SeedItem>
    </Seed>
  );
};

function BracketSection({ tournament }: BracketSectionProps) {
  // Memoize bracketData to avoid unnecessary recalculations
  const bracketData = useMemo(() => {
    if ( !tournament.knockout?.rounds) {
      return { rounds: [] };
    }

    return {
      rounds: tournament.knockout.rounds.map((round, index) => ({
        title:
          index === tournament.knockout.rounds.length - 1
            ? 'Döntő'
            : index === tournament.knockout.rounds.length - 2
            ? 'Elődöntő'
            : `Kör ${index + 1}`,
        seeds: (round.matches || []).map((match: Match) => ({
          id: match._id || `placeholder-${index}`,
          teams: [
            {
              name: match.player1?.name || 'TBD',
              score:
                match.matchReference?.status === 'finished' && match.matchReference?.stats
                  ? match.matchReference.stats.player1.legsWon
                  : null,
            },
            {
              name: match.player2?.name || 'TBD',
              score:
                match.matchReference?.status === 'finished' && match.matchReference?.stats
                  ? match.matchReference.stats.player2.legsWon
                  : null,
            },
          ],
          match,
        })),
      })),
    };
  }, [tournament]);

  if (tournament.status === 'group') {
    return (
      <div className="mt-6">
        <h2 className="text-xl font-bold">Főtábla</h2>
        <p className="">
          Jelenleg nincs főtábla.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6 w-3/4">
      <h2 className="text-xl font-bold ">Főtábla</h2>
      <div className=" overflow-x-auto">
        <Bracket
          rounds={bracketData.rounds}
          renderSeedComponent={(props: IRenderSeedProps) => (
            <CustomSeed
              {...props}
              seed={props.seed as CustomSeed} // Type assertion to include match
            />
          )}
        />
      </div>
    </div>
  );
}

export default BracketSection;