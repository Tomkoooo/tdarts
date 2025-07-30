import React, { useState, useCallback, useRef, useEffect } from 'react';
import debounce from 'lodash.debounce';
import axios from 'axios';
import { IconSearch, IconUserPlus } from '@tabler/icons-react';

interface PlayerSearchProps {
  onPlayerSelected: (player: any) => void;
  placeholder?: string;
  className?: string;
  showAddGuest?: boolean;
  userRole?: 'admin' | 'moderator' | 'member' | 'none';
}

export default function PlayerSearch({ 
  onPlayerSelected, 
  placeholder = "Játékos keresése...",
  className = "",
  showAddGuest = true,
}: PlayerSearchProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [addedIds, setAddedIds] = useState<string[]>([]); // Track added players
  const [justAddedId, setJustAddedId] = useState<string | null>(null); // For visual feedback

  // Debounced search (stable reference)
  const debouncedSearch = useRef(
    debounce((query: string) => {
      searchPlayers(query);
    }, 300)
  ).current;

  const searchPlayers = useCallback(async (query: string) => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const [usersResponse, playersResponse] = await Promise.all([
        axios.get(`/api/users/search?query=${encodeURIComponent(query)}`),
        axios.get(`/api/players/search?query=${encodeURIComponent(query)}`)
      ]);

      const users = usersResponse.data.users || [];
      const players = playersResponse.data.players || [];
      
      // Combine and deduplicate results
      const combined = [...users, ...players].reduce((acc: any[], curr) => {
        if (!acc.find((item: any) => item._id === curr._id)) {
          acc.push(curr);
        }
        return acc;
      }, []);

      setResults(combined);
    } catch (error) {
      console.error('Keresési hiba:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Effect for debounced search
  useEffect(() => {
    debouncedSearch(searchTerm);
    return () => {
      debouncedSearch.cancel();
    };
  }, [searchTerm, debouncedSearch]);

  const handleSelect = async (player: any) => {
    let playerId = player._id;
    // If regisztrált user (from user collection) and no player entry, create player with userRef
    if (!playerId && player.userRef) {
      try {
        const res = await axios.post('/api/players', { name: player.name, userRef: player.userRef });
        playerId = res.data._id;
      } catch (err) {
        // fallback: treat as guest
        console.error('Player search error:', err);
      }
    }
    // If guest or not in player collection, create player without userRef
    if (!playerId && !player.userRef) {
      try {
        const res = await axios.post('/api/players', { name: player.name });
        playerId = res.data._id;
      } catch (err) {
        console.error('Player search error:', err);
      }
    }
    onPlayerSelected({ ...player, _id: playerId });
    setAddedIds((prev) => [...prev, playerId]); // Mark as added
    setJustAddedId(playerId); // For feedback
    setTimeout(() => setJustAddedId(null), 1200); // Remove feedback after 1.2s
  };

  const handleAddGuest = () => {
    if (!searchTerm.trim()) return;
    handleSelect({ name: searchTerm, isGuest: true });
  };

  const rootRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <div className="relative">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="w-full px-4 py-2 pl-10 bg-base-100 rounded-lg outline-none focus:ring-2 ring-primary/20 transition-all"
        />
        <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/60" size={18} />
      </div>
      {isOpen && (searchTerm.trim() || results.length > 0) && (
        <div className="absolute z-50 w-full mt-1 bg-base-200 rounded-lg shadow-lg border border-base-300">
          {isLoading ? (
            <div className="p-4 text-center text-base-content/60">
              Keresés...
            </div>
          ) : results.length > 0 ? (
            <ul className="py-2 max-h-64 overflow-auto">
              {results.filter((player) => !addedIds.includes(player._id)).map((player) => (
                <li
                  key={player._id}
                  className="px-4 py-2 hover:bg-base-100 cursor-pointer flex items-center justify-between gap-2"
                >
                  <span>
                    {player.name}{' '}
                    {player.username && player.username !== 'vendég' ? (
                      <span className="text-base-content/50">(regisztrált)</span>
                    ) : (
                      <span className="text-base-content/50">(vendég)</span>
                    )}
                  </span>
                  <button
                    className={`btn btn-xs btn-primary ${justAddedId === player._id ? 'btn-success pointer-events-none' : ''}`}
                    onClick={() => handleSelect(player)}
                    disabled={justAddedId === player._id}
                  >
                    {justAddedId === player._id ? 'Hozzáadva' : 'Hozzáadás'}
                  </button>
                </li>
              ))}
            </ul>
          ) : searchTerm.trim() && showAddGuest ? (
            <div
              onClick={handleAddGuest}
              className="p-4 text-primary hover:bg-base-100 cursor-pointer flex items-center gap-2"
            >
              <IconUserPlus size={18} />
              <span>Vendég játékos hozzáadása: {searchTerm}</span>
            </div>
          ) : (
            <div className="p-4 text-center text-base-content/60">
              Nincs találat
            </div>
          )}
        </div>
      )}
    </div>
  );
} 