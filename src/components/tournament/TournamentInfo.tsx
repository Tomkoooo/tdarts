import React from 'react';

interface TournamentInfoProps {
  tournament: any;
}

const TournamentInfo: React.FC<TournamentInfoProps> = ({ tournament }) => {
  return (
    <>
      <h1 className="text-3xl font-bold mb-2">{tournament.tournamentSettings?.name}</h1>
      <div className="mb-4">
        <span className="font-semibold">Formátum:</span> {tournament.tournamentSettings?.format}<br />
        <span className="font-semibold">Kezdés:</span> {tournament.tournamentSettings?.startDate ? new Date(tournament.tournamentSettings.startDate).toLocaleString() : '-'}<br />
        <span className="font-semibold">Nevezési díj:</span> {tournament.tournamentSettings?.entryFee} Ft<br />
        <span className="font-semibold">Max. létszám:</span> {tournament.tournamentSettings?.maxPlayers}<br />
        <span className="font-semibold">Kezdő pontszám:</span> {tournament.tournamentSettings?.startingScore}<br />
        <span className="font-semibold">Leírás:</span> {tournament.tournamentSettings?.description || '-'}
      </div>
      <div className="mb-4">
        <h2 className="text-xl font-semibold mb-1">Klub</h2>
        <div><span className="font-semibold">Név:</span> {tournament.clubId?.name}</div>
        <div><span className="font-semibold">Helyszín:</span> {tournament.clubId?.location}</div>
      </div>
    </>
  );
};

export default TournamentInfo; 