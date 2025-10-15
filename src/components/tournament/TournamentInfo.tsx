import React, { useState } from 'react';
import Link from 'next/link';
import { IconScreenShare, IconRefresh, IconEdit, IconUserPlus } from '@tabler/icons-react';
import EditTournamentModal from './EditTournamentModal';

interface TournamentInfoProps {
  tournament: any;
  onRefetch: () => void;
  userRole?: string;
  userId?: string;
}

const TournamentInfo: React.FC<TournamentInfoProps> = ({ tournament, onRefetch, userRole, userId }) => {
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);

  // Description with clickable https links
  const rawDescription: string = tournament.tournamentSettings?.description || '-';
  const description = typeof rawDescription === 'string'
    ? rawDescription.replace(
        /((?:https?:\/\/|www\.)[^\s]+)/g,
        (url) => {
          const href = url.startsWith('http') ? url : `http://${url}`;
          return `<a href="${href}" target="_blank" rel="noopener noreferrer" class="text-primary underline">${url}</a>`;
        }
      )
    : '-';
  const isDescriptionLong = description.length > 100;
  const displayDescription = isDescriptionExpanded ? description : description.substring(0, 100);

  const canEdit = userRole === 'admin' || userRole === 'moderator';

  return (
    <>
      <div className="flex justify-between items-start mb-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold">{tournament.tournamentSettings?.name}</h1>
          <h3 className="text-md italic font-semibold">Torna azonosító: {tournament.tournamentId}</h3>
        </div>
        {canEdit && (
          <button
            onClick={() => setEditModalOpen(true)}
            className="btn btn-outline btn-sm flex items-center gap-2"
            title="Torna szerkesztése"
          >
            <IconEdit className="w-4 h-4" />
            Szerkesztés
          </button>
        )}
      </div>
      
      <div className="mb-4">
        <span className="font-semibold">Formátum:</span> {tournament.tournamentSettings?.format}<br />
        <span className="font-semibold">Kezdés:</span> {tournament.tournamentSettings?.startDate ? new Date(tournament.tournamentSettings.startDate).toLocaleString() : '-'}<br />
        <span className="font-semibold">Helyszín:</span> {tournament.tournamentSettings?.location || tournament.clubId?.location}<br />
        <span className="font-semibold">Nevezési díj:</span> {tournament.tournamentSettings?.entryFee} Ft<br />
        <span className="font-semibold">Max. létszám:</span> {tournament.tournamentSettings?.maxPlayers}<br />
        <span className="font-semibold">Kezdő pontszám:</span> {tournament.tournamentSettings?.startingScore}<br />
        <span className="font-semibold">Leírás:</span>{" "}
        <span
          dangerouslySetInnerHTML={{ __html: displayDescription }}
        />
        {isDescriptionLong && (
          <button
            onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
            className="text-primary hover:text-primary-focus ml-1 font-semibold"
          >
            {isDescriptionExpanded ? '... kevesebb' : '... több'}
          </button>
        )}
      </div>
      <div className="mb-4">
        <h2 className="text-xl font-semibold mb-1">Rendezői adatok:</h2>
        <Link 
          href={`/clubs/${tournament.clubId?._id}`} 
          className="text-primary hover:text-primary/80 hover:underline font-semibold transition-colors"
        >
          {tournament.clubId?.name}
        </Link> - <span>{tournament.clubId?.location}</span>
        <div className="flex flex-col mt-1">
          {tournament.clubId.contact.email && <a href={`mailto:${tournament.clubId.contact.email}`} className="text-primary hover:text-primary-focus ml-1 font-semibold"  >{tournament.clubId.contact.email}</a>}
          {tournament.clubId.contact.phone && <a href={`tel:${tournament.clubId.contact.phone}`} className="text-primary hover:text-primary-focus ml-1 font-semibold">{tournament.clubId.contact.phone}</a>}
          {tournament.clubId.contact.website && <a href={tournament.clubId.contact.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary-focus ml-1 font-semibold">{tournament.clubId.contact.website}</a>}
        </div>
      </div>
      
      <div className="mt-6 flex gap-4 flex-wrap">
        <Link target="_blank" href={`/board/${tournament.tournamentId}`} className="btn btn-primary btn-md flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Táblák megnyitása
        </Link>
        <button
          onClick={() => onRefetch()}
          className="btn btn-primary btn-md flex items-center gap-2"
        >
          <IconRefresh className="w-5 h-5" />
          Frissítés
        </button>
        <Link href={`/tournaments/${tournament.tournamentId}#registration`} className="lg:hidden btn btn-primary btn-md flex items-center gap-2">
          <IconUserPlus className="w-5 h-5" />
          Nevezés
        </Link>
        {tournament.status !== 'finished' && tournament.status !== 'pending' && (
          <Link href={`/tournaments/${tournament.tournamentId}/live`} className="btn btn-primary btn-md flex items-center gap-2">
            <IconScreenShare className="w-5 h-5" />
            Élő követés
          </Link>
        )}
      </div>

      {/* Edit Tournament Modal */}
      {canEdit && userId && (
        <EditTournamentModal
          isOpen={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          tournament={tournament}
          userId={userId}
          onTournamentUpdated={onRefetch}
        />
      )}
    </>
  );
};

export default TournamentInfo; 