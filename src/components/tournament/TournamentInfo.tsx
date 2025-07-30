import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

interface TournamentInfoProps {
  tournament: any;
}

const TournamentInfo: React.FC<TournamentInfoProps> = ({ tournament }) => {
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const router = useRouter();

  const description = tournament.tournamentSettings?.description || '-';
  const isDescriptionLong = description.length > 100;
  const displayDescription = isDescriptionExpanded ? description : description.substring(0, 100);

  const handleOpenBoards = () => {
    router.push(`/board/${tournament.tournamentId}`);
  };

  return (
    <>
      <h1 className="text-3xl font-bold mb-2">{tournament.tournamentSettings?.name}</h1>
      <div className="mb-4">
        <span className="font-semibold">Formátum:</span> {tournament.tournamentSettings?.format}<br />
        <span className="font-semibold">Kezdés:</span> {tournament.tournamentSettings?.startDate ? new Date(tournament.tournamentSettings.startDate).toLocaleString() : '-'}<br />
        <span className="font-semibold">Nevezési díj:</span> {tournament.tournamentSettings?.entryFee} Ft<br />
        <span className="font-semibold">Max. létszám:</span> {tournament.tournamentSettings?.maxPlayers}<br />
        <span className="font-semibold">Kezdő pontszám:</span> {tournament.tournamentSettings?.startingScore}<br />
        <span className="font-semibold">Leírás:</span> {displayDescription}
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
        <h2 className="text-xl font-semibold mb-1">Klub</h2>
        <div><span className="font-semibold">Név:</span> {tournament.clubId?.name}</div>
        <div><span className="font-semibold">Helyszín:</span> {tournament.clubId?.location}</div>
      </div>
      
      <div className="mt-6">
        <button
          onClick={handleOpenBoards}
          className="btn btn-primary btn-lg flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Táblák megnyitása
        </button>
      </div>
    </>
  );
};

export default TournamentInfo; 