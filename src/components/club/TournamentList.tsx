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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Tornák</h2>
        {(userRole === 'admin' || userRole === 'moderator') && onCreateTournament && (
          <button
            onClick={onCreateTournament}
            className="btn btn-primary btn-sm"
          >
            Új torna
          </button>
        )}
      </div>
      {tournaments.length === 0 ? (
        <div className="text-center py-12 bg-base-100 rounded-xl">
          <IconTrophy size={48} className="mx-auto mb-4 text-base-content/40" />
          <p className="text-base-content/60">
            Még nincsenek tornák ebben a klubban.
            {(userRole === 'admin' || userRole === 'moderator') && onCreateTournament && (
              <button
                onClick={onCreateTournament}
                className="ml-2 text-primary hover:underline"
              >
                Hozz létre egyet!
              </button>
            )}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tournaments.map((tournament) => (
            <div key={tournament._id} className="relative group bg-base-100 rounded-xl p-6 shadow hover:shadow-lg transition-all border border-base-300 hover:border-primary/30 flex flex-col">
              <div className="flex items-start justify-between mb-4">
                <h3 className="font-semibold group-hover:text-primary transition-colors">
                  {tournament.name}
                </h3>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[tournament.status]}`}>
                  {statusLabels[tournament.status]}
                </span>
                {(userRole === 'admin' || userRole === 'moderator') && (
                  <div className="dropdown dropdown-end ml-2">
                    <label tabIndex={0} className="btn btn-xs btn-ghost px-2">
                      <IconDotsVertical size={16} />
                    </label>
                    <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-32">
                      <li><button className="text-error">Törlés</button></li>
                      {/* <li><button>Szerkesztés</button></li> */}
                    </ul>
                  </div>
                )}
              </div>
              <div className="space-y-2 flex-1">
                {tournament.startDate && (
                  <div className="flex items-center text-sm text-base-content/60">
                    <IconCalendar size={16} className="mr-2" />
                    {new Date(tournament.startDate).toLocaleDateString('hu-HU')}
                  </div>
                )}
              </div>
              <Link
                href={`/tournaments/${tournament.tournamentId}`}
                className="mt-4 flex items-center justify-end text-primary hover:underline"
              >
                <span className="text-sm">Részletek</span>
                <IconArrowRight size={16} className="ml-1 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}