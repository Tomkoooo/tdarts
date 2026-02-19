import React, { useState, useCallback, useRef, useEffect } from 'react'
import debounce from 'lodash.debounce'
import axios from 'axios'
import { IconSearch, IconUserPlus } from '@tabler/icons-react'
import { cn } from '@/lib/utils'
import { Input } from "@/components/ui/Input"
import { Button } from '@/components/ui/Button'
import { useTranslations } from 'next-intl'

interface PlayerSearchProps {
  onPlayerSelected: (player: any) => void
  placeholder?: string
  className?: string
  showAddGuest?: boolean
  userRole?: 'admin' | 'moderator' | 'member' | 'none'
  clubId?: string
  isForTournament?: boolean
  excludePlayerIds?: string[]
  excludedPlayers?: any[] // Optional: list of player objects to exclude
  excludeGuests?: boolean // Optional: exclude guest players (those without userRef/username)
}

export default function PlayerSearch({
  onPlayerSelected,
  placeholder,
  className = '',
  showAddGuest = true,
  clubId,
  isForTournament = false,
  excludePlayerIds = [],
  excludedPlayers = [],
  excludeGuests = false,
}: PlayerSearchProps) {
  const t = useTranslations('Club.player_search')
  const [searchTerm, setSearchTerm] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [addedIds, setAddedIds] = useState<string[]>([])
  const [justAddedId, setJustAddedId] = useState<string | null>(null)

  // Helper function to get all possible identifiers from a player object
  const getPlayerIdentifiers = (player: any): string[] => {
    const identifiers: string[] = []
    
    // Direct IDs
    if (player._id) identifiers.push(player._id.toString())
    if (player.userRef) identifiers.push(player.userRef.toString())
    if (player.name) identifiers.push(player.name)
    
    // Nested IDs (for tournament players with playerReference)
    if (player.playerReference) {
      if (player.playerReference._id) identifiers.push(player.playerReference._id.toString())
      if (player.playerReference.userRef) identifiers.push(player.playerReference.userRef.toString())
    }
    
    return identifiers
  }

  // Helper function to check if a player should be excluded
  const isPlayerExcluded = useCallback((player: any): boolean => {
    const playerIdentifiers = getPlayerIdentifiers(player)
    
    // Check against excludePlayerIds
    if (excludePlayerIds.length > 0) {
      const isExcludedById = excludePlayerIds.some(excludeId => 
        playerIdentifiers.includes(excludeId.toString())
      )
      if (isExcludedById) return true
    }
    
    // Check against excludedPlayers
    if (excludedPlayers.length > 0) {
      const isExcludedByObject = excludedPlayers.some(excludedPlayer => {
        const excludedIdentifiers = getPlayerIdentifiers(excludedPlayer)
        return playerIdentifiers.some(id => excludedIdentifiers.includes(id))
      })
      if (isExcludedByObject) return true
    }
    
    // Check against addedIds (locally added players)
    if (addedIds.length > 0) {
      const isExcludedByAdded = playerIdentifiers.some(id => addedIds.includes(id))
      if (isExcludedByAdded) return true
    }
    
    return false
  }, [excludePlayerIds, excludedPlayers, addedIds])

  // Sync addedIds with excludePlayerIds and excludedPlayers - remove IDs that are no longer excluded
  // Memoize the excluded IDs to prevent infinite loops
  const excludedIdsString = React.useMemo(() => {
    const excludedSet = new Set<string>()
    
    // Add excludePlayerIds
    excludePlayerIds.forEach(id => excludedSet.add(id.toString()))
    
    // Add identifiers from excludedPlayers
    excludedPlayers.forEach(player => {
      getPlayerIdentifiers(player).forEach(id => excludedSet.add(id))
    })
    
    return Array.from(excludedSet).sort().join(',')
  }, [
    excludePlayerIds.join(','),
    excludedPlayers.map(p => {
      const ids = getPlayerIdentifiers(p)
      return ids.sort().join('|')
    }).sort().join('||')
  ])
  
  useEffect(() => {
    // Parse the excluded IDs string back to a Set
    const excludedSet = new Set(excludedIdsString.split(',').filter(Boolean))
    
    setAddedIds((prev) => {
      // Remove IDs that are no longer excluded (player was removed from list)
      const filtered = prev.filter(id => {
        // Keep ID if it's still excluded OR if it was just added (within timeout)
        return excludedSet.has(id) || id === justAddedId
      })
      // Only update if something actually changed
      if (filtered.length !== prev.length || filtered.some((id, i) => id !== prev[i])) {
        return filtered
      }
      return prev
    })
  }, [excludedIdsString, justAddedId])

  const debouncedSearch = useRef(
    debounce((query: string) => {
      searchPlayers(query)
    }, 300)
  ).current

  const searchPlayers = useCallback(
    async (query: string) => {
      if (!query.trim()) {
        setResults([])
        return
      }

      setIsLoading(true)
      try {
        const [usersResponse, playersResponse] = await Promise.all([
          axios.get(`/api/users/search?query=${encodeURIComponent(query)}&clubId=${clubId || ''}`),
          axios.get(`/api/players/search?query=${encodeURIComponent(query)}&clubId=${clubId || ''}`),
        ])

        const users = usersResponse.data.users || []
        const players = playersResponse.data.players || []

        let combined = [...users, ...players].reduce((acc: any[], curr) => {
          if (curr.userRef) {
            const existingPlayer = acc.find((item: any) =>
              (item.userRef && item.userRef.toString() === curr.userRef.toString()) ||
              (item._id && item._id.toString() === curr.userRef.toString())
            )

            if (!existingPlayer) {
              acc.push(curr)
            } else {
              const existingIndex = acc.findIndex((item: any) =>
                (item.userRef && item.userRef.toString() === curr.userRef.toString()) ||
                (item._id && item._id.toString() === curr.userRef.toString())
              )

              if (existingIndex !== -1) {
                const existing = acc[existingIndex]
                if (curr.hasOwnProperty('username') && !existing.hasOwnProperty('username')) {
                  acc[existingIndex] = curr
                }
              }
            }
          } else {
            const existingPlayer = acc.find((item: any) => item._id && item._id.toString() === curr._id.toString())
            if (!existingPlayer) {
              acc.push(curr)
            }
          }
          return acc
        }, [])

        if (clubId && !isForTournament) {
          combined = combined.filter((player) => {
            if (player.isAdminInAnyClub) return false
            if (player.isCurrentClubMember) return false
            return true
          })
        }

        // Filter out excluded players using the helper function
        combined = combined.filter((player) => {
          if (excludeGuests) {
            const isGuest = !player.userRef && !player.username;
            if (isGuest) return false;
          }
          return !isPlayerExcluded(player);
        });

        setResults(combined)
      } catch (error) {
        console.error(t('error'), error)
        setResults([])
      } finally {
        setIsLoading(false)
      }
    },
    [clubId, isForTournament, excludePlayerIds, excludedPlayers, addedIds, isPlayerExcluded, t]
  )

  useEffect(() => {
    debouncedSearch(searchTerm)
    return () => {
      debouncedSearch.cancel()
    }
  }, [searchTerm, debouncedSearch])

  const handleSelect = async (player: any) => {
    let playerData = {
      _id: player._id,
      name: player.name,
      userRef: player.userRef,
      username: player.username,
      isGuest: !player.userRef && !player.username,
    }

    if (player.username && !player.userRef) {
      try {
        const playerResponse = await axios.get(`/api/players/find-by-user/${player._id}`)
        if (playerResponse.data.success && playerResponse.data.player) {
          const actualPlayer = playerResponse.data.player
          playerData = {
            _id: actualPlayer._id,
            name: actualPlayer.name,
            userRef: actualPlayer.userRef,
            username: player.username,
            isGuest: false,
          }
        }
      } catch (error) {
        console.error('Error finding Player document:', error)
      }
    }

    onPlayerSelected(playerData)

    const playerIdentifier = playerData.userRef
      ? playerData.userRef.toString()
      : playerData._id
      ? playerData._id.toString()
      : playerData.name

    setAddedIds((prev) => [...prev, playerIdentifier])
    setJustAddedId(playerIdentifier)
    setTimeout(() => setJustAddedId(null), 1200)
  }

  const handleAddGuest = () => {
    if (!searchTerm.trim()) return
    handleSelect({ name: searchTerm, isGuest: true })
  }

  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    } else {
      document.removeEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <div className="relative">
        <Input
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value)
            setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="pl-10"
        />
        <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      </div>
      {isOpen && (searchTerm.trim() || results.length > 0) && (
        <div className="relative z-50 w-full mt-2 shadow-2xl shadow-black/30 bg-background/95 backdrop-blur-xl">
          <div className="max-h-72 overflow-y-auto">
            {isLoading ? (
              <div className="py-6 text-center text-sm text-muted-foreground">{t('searching')}</div>
            ) : results.length > 0 ? (
              results
                .filter((player) => !isPlayerExcluded(player))
                .map((player, index, filteredResults) => {
                  const playerIdentifier = player.userRef
                    ? player.userRef.toString()
                    : player._id
                    ? player._id.toString()
                    : player.name
                  const isJustAdded = justAddedId === playerIdentifier
                  const isLast = index === filteredResults.length - 1

                  return (
                    <div key={playerIdentifier}>
                      <div className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
                      <div className="flex-1">
                        <div className="font-medium text-foreground">{player.name}</div>
                        <div className="text-xs text-muted-foreground flex flex-wrap gap-2">
                          {player.username ? (
                            <>
                              <span>{t('registered')}</span>
                              {player.clubName && <span>{t('club_member', { clubName: player.clubName })}</span>}
                            </>
                          ) : player.userRef ? (
                            <>
                              <span>{t('registered_player')}</span>
                              {player.clubName && <span>{t('club_member', { clubName: player.clubName })}</span>}
                            </>
                          ) : (
                            <span>{t('guest')}</span>
                          )}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleSelect(player)}
                        disabled={isJustAdded}
                        className={cn('h-8 text-xs px-3', isJustAdded && 'pointer-events-none')}
                      >
                        {isJustAdded ? t('added') : t('add')}
                      </Button>
                      </div>
                      {!isLast && (
                        <div className="h-px bg-gradient-to-r from-transparent via-border/40 to-transparent mx-4" />
                      )}
                    </div>
                  )
                })
            ) : searchTerm.trim() && showAddGuest ? (
              <Button
                variant="ghost"
                className="w-full justify-start gap-2 text-sm"
                onClick={handleAddGuest}
              >
                <IconUserPlus className="h-4 w-4" />
                {t('add_guest', { name: searchTerm })}
              </Button>
            ) : (
              <div className="py-6 text-center text-sm text-muted-foreground">{t('no_results')}</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}