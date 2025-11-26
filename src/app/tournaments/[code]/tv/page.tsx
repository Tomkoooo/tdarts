"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import { IconX, IconQrcode, IconGripVertical } from "@tabler/icons-react"
import { useRealTimeUpdates } from "@/hooks/useRealTimeUpdates"
import axios from "axios"
import QRCode from 'react-qr-code'
import Rankings180 from "@/components/tournament/tv/Rankings180"
import RankingsCheckout from "@/components/tournament/tv/RankingsCheckout"
import BoardStatus from "@/components/tournament/tv/BoardStatus"
import GroupsDisplay from "@/components/tournament/tv/GroupsDisplay"

export default function TVModePage() {
  const { code } = useParams()
  const router = useRouter()
  const [tournament, setTournament] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [qrExpanded, setQrExpanded] = useState(true)
  const [qrPosition, setQrPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

  // Fetch tournament data
  const fetchTournament = useCallback(async () => {
    if (!code) return
    try {
      const res = await axios.get(`/api/tournaments/${code}`)
      setTournament(res.data)
    } catch (error) {
      console.error('Error fetching tournament:', error)
    } finally {
      setLoading(false)
    }
  }, [code])

  // Silent refresh for live updates
  const silentRefresh = useCallback(async () => {
    if (!code) return
    try {
      const res = await axios.get(`/api/tournaments/${code}`)
      setTournament(res.data)
    } catch (error) {
      console.error('Silent refresh error:', error)
    }
  }, [code])

  useEffect(() => {
    fetchTournament()
  }, [fetchTournament])

  // Real-time updates
  const { lastEvent } = useRealTimeUpdates()
  useEffect(() => {
    if (lastEvent) {
      console.log('TV Mode - Received event:', lastEvent.type, lastEvent.data)
      if (lastEvent.type === 'tournament-update' || 
          lastEvent.type === 'match-update' || 
          lastEvent.type === 'group-update') {
        const eventTournamentId = lastEvent.data?.tournamentId
        if (!eventTournamentId || eventTournamentId === code) {
          console.log('TV Mode - Triggering silent refresh')
          silentRefresh()
        }
      }
    }
  }, [lastEvent, silentRefresh, code])

  // Calculate dynamic height for boards section
  const boardSectionHeight = useMemo(() => {
    if (!tournament?.boards) return 45
    const waitingBoards = tournament.boards.filter((b: any) => b.status === 'waiting')
    const boardCount = waitingBoards.length
    
    // Each board card is roughly 80px, plus padding and header
    // Min 40vh, max 60vh (increased from 20-50vh)
    if (boardCount === 0) return 30
    if (boardCount <= 2) return 35
    if (boardCount <= 4) return 42
    if (boardCount <= 6) return 48
    return 50
  }, [tournament?.boards])

  const handleExit = () => {
    router.push(`/tournaments/${code}`)
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    setDragStart({
      x: e.clientX - qrPosition.x,
      y: e.clientY - qrPosition.y
    })
  }

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging) {
      setQrPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      })
    }
  }, [isDragging, dragStart])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  if (loading) {
    return (
      <div className="h-screen w-screen bg-background flex items-center justify-center">
        <div className="text-foreground text-2xl">Loading...</div>
      </div>
    )
  }

  if (!tournament) {
    return (
      <div className="h-screen w-screen bg-background flex items-center justify-center">
        <div className="text-foreground text-2xl">Tournament not found</div>
      </div>
    )
  }

  const tournamentUrl = process.env.NEXT_PUBLIC_NODE_ENV === 'development' ? 'http://localhost:3000/tournaments/${code}' : `https://tdarts.sironic.hu/tournaments/${code}` 

  return (
    <div className="h-screen w-screen overflow-hidden bg-background text-foreground relative">
      {/* Header - 5vh */}
      <header className="h-[5vh] px-6 flex items-center justify-between bg-muted/5">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">{tournament.tournamentSettings?.name || 'Tournament'}</h1>
          <span className="text-sm text-muted-foreground uppercase tracking-wider">
            {tournament.tournamentSettings?.status || 'Live'}
          </span>
        </div>
        <button
          onClick={handleExit}
          className="flex items-center gap-2 px-4 py-2 bg-muted/20 hover:bg-muted/40 rounded-lg transition-colors"
        >
          <IconX className="h-5 w-5" />
          <span>Exit</span>
        </button>
      </header>

      {/* Main Content - 95vh */}
      <main className="h-[95vh] p-4 flex flex-col gap-4">
        {/* Top Section - Dynamic height based on board count */}
        <div className="grid grid-cols-3 gap-4" style={{ height: `${boardSectionHeight}vh` }}>
          <Rankings180 tournament={tournament} />
          <RankingsCheckout tournament={tournament} />
          <BoardStatus tournament={tournament} />
        </div>

        {/* Bottom Section - Remaining space */}
        <div className="overflow-hidden" style={{ height: `calc(95vh - ${boardSectionHeight}vh - 1rem)` }}>
          <GroupsDisplay tournament={tournament} />
        </div>
      </main>

      {/* Draggable QR Code */}
      <div
        className="fixed z-50 select-none"
        style={{
          left: qrPosition.x || 'auto',
          right: qrPosition.x ? 'auto' : '24px',
          top: qrPosition.y || 'auto',
          bottom: qrPosition.y ? 'auto' : '24px',
          cursor: isDragging ? 'grabbing' : 'grab'
        }}
      >
        {qrExpanded ? (
          <div className="bg-white p-4 rounded-xl shadow-2xl border-4 border-primary">
            <div
              className="flex items-center justify-between mb-2 cursor-grab active:cursor-grabbing"
              onMouseDown={handleMouseDown}
            >
              <IconGripVertical className="h-4 w-4 text-gray-600" />
              <button
                onClick={() => setQrExpanded(false)}
                className="text-gray-600 hover:text-gray-800"
              >
                <IconX className="h-4 w-4" />
              </button>
            </div>
            <QRCode value={tournamentUrl} size={160} level="H" />
            <div className="text-center mt-2 text-xs font-semibold text-gray-800">
              Scan to join
            </div>
          </div>
        ) : (
          <button
            onClick={() => setQrExpanded(true)}
            className="bg-primary text-primary-content px-4 py-2 rounded-lg shadow-xl hover:bg-primary/90 transition-colors flex items-center gap-2"
          >
            <IconQrcode className="h-5 w-5" />
            <span className="font-semibold">Open QR</span>
          </button>
        )}
      </div>
    </div>
  )
}
