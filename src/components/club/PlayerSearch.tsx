import React, { useState, useCallback, useRef, useEffect } from 'react'
import debounce from 'lodash.debounce'
import axios from 'axios'
import { IconSearch, IconUserPlus } from '@tabler/icons-react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

interface PlayerSearchProps {
  onPlayerSelected: (player: any) => void
  placeholder?: string
  className?: string
  showAddGuest?: boolean
  userRole?: 'admin' | 'moderator' | 'member' | 'none'
  clubId?: string
  isForTournament?: boolean
  excludePlayerIds?: string[]
}

export default function PlayerSearch({
  onPlayerSelected,
  placeholder = 'Játékos keresése...',
  className = '',
  showAddGuest = true,
  clubId,
  isForTournament = false,
  excludePlayerIds = [],
}: PlayerSearchProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [addedIds, setAddedIds] = useState<string[]>([])
  const [justAddedId, setJustAddedId] = useState<string | null>(null)

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

        if (isForTournament && excludePlayerIds.length > 0) {
          combined = combined.filter((player) => {
            const playerId = player._id?.toString()
            const userRef = player.userRef?.toString()
            return !excludePlayerIds.some(
              (excludeId) => excludeId.toString() === playerId || excludeId.toString() === userRef
            )
          })
        }

        setResults(combined)
      } catch (error) {
        console.error('Keresési hiba:', error)
        setResults([])
      } finally {
        setIsLoading(false)
      }
    },
    [clubId, isForTournament, excludePlayerIds]
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
        <Card className="absolute z-50 w-full mt-2 border-border shadow-xl">
          <CardContent className="p-2 max-h-72 overflow-auto space-y-1">
            {isLoading ? (
              <div className="py-6 text-center text-sm text-muted-foreground">Keresés...</div>
            ) : results.length > 0 ? (
              results
                .filter((player) => {
                  const playerIdentifier = player.userRef
                    ? player.userRef.toString()
                    : player._id
                    ? player._id.toString()
                    : player.name
                  return !addedIds.includes(playerIdentifier)
                })
                .map((player) => {
                  const playerIdentifier = player.userRef
                    ? player.userRef.toString()
                    : player._id
                    ? player._id.toString()
                    : player.name
                  const isJustAdded = justAddedId === playerIdentifier

                  return (
                    <div
                      key={playerIdentifier}
                      className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 hover:bg-muted"
                    >
                      <div className="flex-1">
                        <div className="font-medium text-foreground">{player.name}</div>
                        <div className="text-xs text-muted-foreground flex flex-wrap gap-2">
                          {player.username ? (
                            <>
                              <span>Regisztrált</span>
                              {player.clubName && <span>• {player.clubName}</span>}
                            </>
                          ) : player.userRef ? (
                            <>
                              <span>Regisztrált játékos</span>
                              {player.clubName && <span>• {player.clubName}</span>}
                            </>
                          ) : (
                            <span>Vendég</span>
                          )}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleSelect(player)}
                        disabled={isJustAdded}
                        className={cn('h-8 text-xs px-3', isJustAdded && 'pointer-events-none')}
                      >
                        {isJustAdded ? 'Hozzáadva' : 'Hozzáadás'}
                      </Button>
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
                Vendég játékos hozzáadása: {searchTerm}
              </Button>
            ) : (
              <div className="py-6 text-center text-sm text-muted-foreground">Nincs találat</div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
} 