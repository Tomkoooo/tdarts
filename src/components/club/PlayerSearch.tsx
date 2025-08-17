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
  clubId?: string; // For filtering out players already in other clubs
  isForTournament?: boolean; // For showing club info when adding to tournament
  excludePlayerIds?: string[]; // For excluding players already added to tournament
}

export default function PlayerSearch({ 
  onPlayerSelected, 
  placeholder = "Játékos keresése...",
  className = "",
  showAddGuest = true,
  clubId,
  isForTournament = false,
  excludePlayerIds = [],
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
        axios.get(`/api/users/search?query=${encodeURIComponent(query)}&clubId=${clubId || ''}`),
        axios.get(`/api/players/search?query=${encodeURIComponent(query)}&clubId=${clubId || ''}`)
      ]);

      const users = usersResponse.data.users || [];
      const players = playersResponse.data.players || [];
      
      // Combine and deduplicate results with priority logic
      let combined = [...users, ...players].reduce((acc: any[], curr) => {
        // For users (with userRef), check if there's already a player with the same userRef
        if (curr.userRef) {
          const existingPlayer = acc.find((item: any) => 
            (item.userRef && item.userRef.toString() === curr.userRef.toString()) ||
            (item._id && item._id.toString() === curr.userRef.toString())
          );
          
          if (!existingPlayer) {
            acc.push(curr);
          } else {
            // If we have both a user and a player with the same userRef, prioritize the user
            // Remove the player and keep the user
            const existingIndex = acc.findIndex((item: any) => 
              (item.userRef && item.userRef.toString() === curr.userRef.toString()) ||
              (item._id && item._id.toString() === curr.userRef.toString())
            );
            
            if (existingIndex !== -1) {
              const existing = acc[existingIndex];
              // If current is a user and existing is a player, replace the player with user
              if (curr.hasOwnProperty('username') && !existing.hasOwnProperty('username')) {
                acc[existingIndex] = curr;
              }
              // If both are users or both are players, keep the first one
            }
          }
        } else {
          // For players without userRef (guest players), check by _id
          const existingPlayer = acc.find((item: any) => 
            item._id && item._id.toString() === curr._id.toString()
          );
          if (!existingPlayer) {
            acc.push(curr);
          }
        }
        return acc;
      }, []);

      // Filter out players who are already admin/moderator in any club or already members of this club (only when adding to club, not tournament)
      if (clubId && !isForTournament) {
        combined = combined.filter((player) => {
          // If player is already admin/moderator in any club, filter them out
          if (player.isAdminInAnyClub) {
            return false;
          }
          
          // If player is already a member of this club, filter them out
          if (player.isCurrentClubMember) {
            return false;
          }
          
          return true;
        });
      }

      // Filter out players already added to tournament (when adding to tournament)
      if (isForTournament && excludePlayerIds.length > 0) {
        combined = combined.filter((player) => {
          const playerId = player._id?.toString();
          const userRef = player.userRef?.toString();
          
          // Check if player is already in the exclude list
          return !excludePlayerIds.some(excludeId => 
            excludeId.toString() === playerId || excludeId.toString() === userRef
          );
        });
      }

      setResults(combined);
    } catch (error) {
      console.error('Keresési hiba:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [clubId, isForTournament, excludePlayerIds]);

  // Effect for debounced search
  useEffect(() => {
    debouncedSearch(searchTerm);
    return () => {
      debouncedSearch.cancel();
    };
  }, [searchTerm, debouncedSearch]);

  const handleSelect = async (player: any) => {
    // Ensure we have the correct data structure
    const playerData = {
      _id: player._id,
      name: player.name,
      userRef: player.userRef,
      username: player.username,
      isGuest: !player.userRef && !player.username // If no userRef and no username, it's a guest
    };
    
    // Pass the player data to the parent
    onPlayerSelected(playerData);
    
    // Use a more reliable identifier for tracking added players
    const playerIdentifier = player.userRef ? player.userRef.toString() : (player._id ? player._id.toString() : player.name);
    setAddedIds((prev) => [...prev, playerIdentifier]); // Mark as added
    setJustAddedId(playerIdentifier); // For feedback
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
              {results.filter((player) => {
                const playerIdentifier = player.userRef ? player.userRef.toString() : (player._id ? player._id.toString() : player.name);
                return !addedIds.includes(playerIdentifier);
              }).map((player) => (
                <li
                  key={player.userRef || player._id || player.name}
                  className="px-4 py-2 hover:bg-base-100 cursor-pointer flex items-center justify-between gap-2"
                >
                  <div className="flex-1">
                    <div className="font-medium">{player.name}</div>
                    <div className="text-sm text-base-content/60">
                      {player.username ? (
                        <>
                          <span>(regisztrált)</span>
                          {player.clubName && (
                            <span> - {player.clubName}</span>
                          )}
                        </>
                      ) : player.userRef ? (
                        <>
                          <span>(regisztrált játékos)</span>
                          {player.clubName && (
                            <span> - {player.clubName}</span>
                          )}
                        </>
                      ) : (
                        <span>(vendég)</span>
                      )}
                    </div>
                  </div>
                  <button
                    className={`btn btn-xs btn-primary ${justAddedId === (player.userRef ? player.userRef.toString() : (player._id ? player._id.toString() : player.name)) ? 'btn-success pointer-events-none' : ''}`}
                    onClick={() => handleSelect(player)}
                    disabled={justAddedId === (player.userRef ? player.userRef.toString() : (player._id ? player._id.toString() : player.name))}
                  >
                    {justAddedId === (player.userRef ? player.userRef.toString() : (player._id ? player._id.toString() : player.name)) ? 'Hozzáadva' : 'Hozzáadás'}
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