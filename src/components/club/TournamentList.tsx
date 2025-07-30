import React from 'react';
import Link from 'next/link';
import { IconTrophy, IconCalendar, IconArrowRight, IconDotsVertical } from '@tabler/icons-react';

interface TournamentListProps {
  tournaments: Array<{
    _id: string;
    name: string;
    tournamentId: string;
    status: 'pending' | 'active' | 'finished';
    startDate?: string;
  }>;
  userRole: 'admin' | 'moderator' | 'member' | 'none';
  onCreateTournament?: () => void;
}

const statusColors = {
  pending: 'bg-warning/10 text-warning',
  active: 'bg-success/10 text-success',
  finished: 'bg-base-300 text-base-content/60',
};

const statusLabels = {
  pending: 'Várakozó',
  active: 'Aktív',
  finished: 'Befejezett',
};

export default function TournamentList({ tournaments, userRole, onCreateTournament }: TournamentListProps) {
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
            <div key={tournament._id} className="relative group bg-base-100 rounded-xl p-4 md:p-6 shadow hover:shadow-lg transition-all border border-base-300 hover:border-primary/30 flex flex-col">
              <div className="flex items-start justify-between mb-3 md:mb-4">
                <h3 className="font-semibold group-hover:text-primary transition-colors text-sm md:text-base flex-1 mr-2">
                  {tournament.name}
                </h3>
                <div className="flex items-center gap-1">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[tournament.status]}`}>
                    {statusLabels[tournament.status]}
                  </span>
                  {(userRole === 'admin' || userRole === 'moderator') && (
                    <div className="dropdown dropdown-end">
                      <label tabIndex={0} className="btn btn-xs btn-ghost px-1">
                        <IconDotsVertical size={14} className="md:w-4 md:h-4" />
                      </label>
                      <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-28 md:w-32">
                        <li><button className="text-error text-xs md:text-sm">Törlés</button></li>
                        {/* <li><button>Szerkesztés</button></li> */}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-2 flex-1">
                {tournament.startDate && (
                  <div className="flex items-center text-xs md:text-sm text-base-content/60">
                    <IconCalendar size={14} className="mr-2 md:w-4 md:h-4" />
                    {new Date(tournament.startDate).toLocaleDateString('hu-HU')}
                  </div>
                )}
              </div>
              <Link
                href={`/tournaments/${tournament.tournamentId}`}
                className="mt-3 md:mt-4 flex items-center justify-end text-primary hover:underline"
              >
                <span className="text-xs md:text-sm">Részletek</span>
                <IconArrowRight size={14} className="ml-1 transition-transform group-hover:translate-x-1 md:w-4 md:h-4" />
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}