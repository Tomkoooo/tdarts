"use client"
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Tournament } from '@/interface/tournament.interface';
import GroupSection from './GroupSection';

interface TournamentDetailsPageProps {
  tournamentId: string;
}

export default function TournamentDetailsPage({ tournamentId }: TournamentDetailsPageProps) {
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
  const fetchTournament = async () => {
    setLoading(true);
    try {
        const { data } = await axios.get(`/api/tournaments/${tournamentId}`);
        setTournament(data);
      } catch (e: any) {
        setError('Nem sikerült betölteni a tornát.');
    } finally {
      setLoading(false);
    }
  };
    fetchTournament();
  }, [tournamentId]);

  if (loading) return <div>Betöltés...</div>;
  if (error) return <div className="text-error">{error}</div>;
  if (!tournament) return null;

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-8">
      <div className="bg-white rounded shadow p-4 flex flex-col gap-2">
        <h1 className="text-2xl font-bold">{tournament.tournamentId} - {tournament.tournamentSettings.format.toUpperCase()} Torna</h1>
        <div className="flex flex-wrap gap-4">
          <div><b>Klub:</b> {tournament.clubId.toString()}</div>
          <div><b>Státusz:</b> {tournament.status}</div>
          <div><b>Jelszó:</b> {tournament.tournamentSettings.tournamentPassword}</div>
        </div>
        <div><b>Játékosok:</b> {tournament.players.length}</div>
      </div>
      <GroupSection tournamentId={tournamentId} />
    </div>
  );
}