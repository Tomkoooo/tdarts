import React from 'react';
import Link from 'next/link';
import { IconTrophy, IconCalendar, IconMapPin, IconUsers, IconCoin, IconArrowRight, IconDotsVertical } from '@tabler/icons-react';

interface TournamentCardProps {
  tournament: {
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
  };
  userRole?: 'admin' | 'moderator' | 'member' | 'none';
  showActions?: boolean;
  onDelete?: () => void;
  onEdit?: () => void;
}

const statusColors = {
  pending: 'bg-warning/10 text-warning border-warning/20',
  'group-stage': 'bg-info/10 text-info border-info/20',
  knockout: 'bg-primary/10 text-primary border-primary/20',
  finished: 'bg-success/10 text-success border-success/20',
};

const statusLabels = {
  pending: 'Várakozó',
  'group-stage': 'Csoportkör',
  knockout: 'Kieséses',
  finished: 'Befejezett',
};

const typeLabels = {
  amateur: 'Amatőr',
  open: 'Open',
};

export default function TournamentCard({ 
  tournament, 
  userRole = 'none', 
  showActions = false,
  onDelete,
  onEdit 
}: TournamentCardProps) {
  const now = new Date();
  const registrationDeadline = tournament.tournamentSettings?.registrationDeadline 
    ? new Date(tournament.tournamentSettings.registrationDeadline) 
    : null;
  const isRegistrationClosed = 
    (registrationDeadline !== null && registrationDeadline < now) ||
    tournament.tournamentSettings?.status !== 'pending';

  const playerCount = tournament.tournamentPlayers?.length || 0;
  const maxPlayers = tournament.tournamentSettings?.maxPlayers || 0;
  const isFull = playerCount >= maxPlayers;

  return (
    <Link href={`/tournaments/${tournament.tournamentId}`} className="relative group bg-base-100 rounded-xl p-4 md:p-6 shadow hover:shadow-lg transition-all border border-base-300 hover:border-primary/30 flex flex-col">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold group-hover:text-primary transition-colors text-sm md:text-base line-clamp-2 mb-1">
            {tournament.tournamentSettings?.name}
          </h3>
          {tournament.clubId?.name && (
            <p className="text-xs text-base-content/60 line-clamp-1">
              {tournament.clubId.name}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 ml-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${statusColors[tournament.tournamentSettings?.status || 'pending']}`}>
            {statusLabels[tournament.tournamentSettings?.status || 'pending']}
          </span>
          {showActions && (userRole === 'admin' || userRole === 'moderator') && (
            <div className="dropdown dropdown-end">
              <label tabIndex={0} className="btn btn-xs btn-ghost px-1">
                <IconDotsVertical size={14} className="md:w-4 md:h-4" />
              </label>
              <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-28 md:w-32">
                {onEdit && <li><button onClick={onEdit} className="text-xs md:text-sm">Szerkesztés</button></li>}
                {onDelete && <li><button onClick={onDelete} className="text-error text-xs md:text-sm">Törlés</button></li>}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Tournament Details */}
      <div className="space-y-3 flex-1">
        {/* Date and Location */}
        <div className="space-y-2">
          {tournament.tournamentSettings?.startDate && (
            <div className="flex items-center text-xs md:text-sm text-base-content/70">
              <IconCalendar size={14} className="mr-2 md:w-4 md:h-4 flex-shrink-0" />
              <span>{new Date(tournament.tournamentSettings.startDate).toLocaleDateString('hu-HU')}</span>
            </div>
          )}
          {tournament.tournamentSettings?.location && (
            <div className="flex items-center text-xs md:text-sm text-base-content/70">
              <IconMapPin size={14} className="mr-2 md:w-4 md:h-4 flex-shrink-0" />
              <span className="line-clamp-1">{tournament.tournamentSettings.location}</span>
            </div>
          )}
        </div>

        {/* Tournament Type */}
        {tournament.tournamentSettings?.type && (
          <div className="flex items-center">
            <IconTrophy size={14} className="mr-2 md:w-4 md:h-4 flex-shrink-0 text-warning" />
            <span className="text-xs md:text-sm font-medium">
              {typeLabels[tournament.tournamentSettings.type]}
            </span>
          </div>
        )}

        {/* Players and Registration Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center text-xs md:text-sm text-base-content/70">
            <IconUsers size={14} className="mr-2 md:w-4 md:h-4 flex-shrink-0" />
            <span>
              {playerCount}/{maxPlayers} játékos
              {isFull && <span className="text-warning ml-1">(Tele)</span>}
            </span>
          </div>
          <span className={`badge badge-xs ${isRegistrationClosed ? 'badge-error' : 'badge-success'}`}>
            {isRegistrationClosed ? 'Zárva' : 'Nyitva'}
          </span>
        </div>

        {/* Entry Fee */}
        {tournament.tournamentSettings?.entryFee ? (
          <div className="flex items-center text-xs md:text-sm text-base-content/70">
            <IconCoin size={14} className="mr-2 md:w-4 md:h-4 flex-shrink-0 text-success" />
            <span>Névezési díj: <span className="font-bold">{tournament.tournamentSettings.entryFee} Ft</span></span>
          </div>
        ) : <div className="flex items-center text-xs md:text-sm text-base-content/70">
        <IconCoin size={14} className="mr-2 md:w-4 md:h-4 flex-shrink-0 text-success" />
        <span>Névezési díj: <span className="font-bold">Ingyenes</span></span>
      </div>}
      </div>

      {/* Footer */}
      <div className="mt-4 pt-3 border-t border-base-300">
        <Link
          href={`/tournaments/${tournament.tournamentId}`}
          className="flex items-center justify-between text-primary hover:underline group/link"
        >
          <span className="text-xs md:text-sm font-medium">Részletek</span>
          <IconArrowRight size={14} className="transition-transform group-hover/link:translate-x-1 md:w-4 md:h-4" />
        </Link>
      </div>
    </Link>
  );
} 