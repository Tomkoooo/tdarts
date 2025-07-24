import React, { useState } from 'react';
import axios from 'axios';

interface TournamentGroupsGeneratorProps {
  tournament: any;
  userClubRole: 'admin' | 'moderator' | 'member' | 'none';
  onRefetch: () => void;
}

const TournamentGroupsGenerator: React.FC<TournamentGroupsGeneratorProps> = ({ tournament, userClubRole, onRefetch }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const code = tournament?.tournamentId;

  const handleGenerateGroups = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.post(`/api/tournaments/${code}/generateGroups`);
      if (response.data && !response.data.error) {
        onRefetch();
      } else {
        setError('Nem sikerült csoportokat generálni.');
      }
    } catch (err) {
      setError('Nem sikerült csoportokat generálni.');
    } finally {
      setLoading(false);
    }
  };

  if (userClubRole !== 'admin' && userClubRole !== 'moderator') return null;

  return (
    <div className="mb-4">
      <button className="btn btn-secondary" onClick={handleGenerateGroups} disabled={loading}>
        {loading ? 'Csoportok generálása...' : 'Csoportok generálása'}
      </button>
      {error && <div className="mt-2 text-error">{error}</div>}
    </div>
  );
};

export default TournamentGroupsGenerator; 