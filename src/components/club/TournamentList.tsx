import React from 'react';
import { IconTrophy } from '@tabler/icons-react';
import TournamentCard from '@/components/tournament/TournamentCard';

interface TournamentListProps {
  tournaments: Array<{
    _id: string;
    tournamentId: string;
    tournamentSettings: {
      name: string;
      startDate: string;
      location?: string;
      type?: 'amateur' | 'open';
      entryFee?: number;
      maxPlayers?: number;
      registrationDeadline?: string;
      status: 'pending' | 'group-stage' | 'knockout' | 'finished';
    };
    tournamentPlayers?: Array<any>;
    clubId?: {
      name: string;
    };
  }>;
  userRole: 'admin' | 'moderator' | 'member' | 'none';
  onCreateTournament?: () => void;
  onDeleteTournament?: (tournamentId: string) => void;
  onEditTournament?: (tournamentId: string) => void;
}

export default function TournamentList({ 
  tournaments, 
  userRole, 
  onCreateTournament,
  onDeleteTournament,
  onEditTournament 
}: TournamentListProps) {
  console.log(tournaments);
  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h2 className="text-xl md:text-2xl font-semibold">Tornák</h2>
        {(userRole === 'admin' || userRole === 'moderator') && onCreateTournament && (
          <button
            onClick={onCreateTournament}
            className="btn btn-primary btn-sm md:btn-md w-full sm:w-auto"
          >
            Új torna
          </button>
        )}
      </div>
      {tournaments.length === 0 ? (
        <div className="text-center py-8 md:py-12 bg-base-100 rounded-xl">
          <IconTrophy size={32} className="mx-auto mb-3 md:mb-4 text-base-content/40 md:w-12 md:h-12" />
          <p className="text-sm md:text-base text-base-content/60">
            Még nincsenek tornák ebben a klubban.
            {(userRole === 'admin' || userRole === 'moderator') && onCreateTournament && (
              <button
                onClick={onCreateTournament}
                className="ml-2 text-primary hover:underline text-sm md:text-base"
              >
                Hozz létre egyet!
              </button>
            )}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {tournaments.map((tournament) => (
            <TournamentCard
              key={tournament._id}
              tournament={tournament}
              userRole={userRole}
              showActions={true}
              onDelete={onDeleteTournament ? () => onDeleteTournament(tournament.tournamentId) : undefined}
              onEdit={onEditTournament ? () => onEditTournament(tournament.tournamentId) : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}