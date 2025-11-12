'use client'

import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import {
  IconAlertTriangle,
  IconChartHistogram,
  IconCheck,
  IconChevronRight,
  IconClipboardList,
  IconHierarchy,
  IconMinus,
  IconPlayerPause,
  IconPlayerPlay,
  IconPlus,
  IconRefresh,
  IconSettings,
  IconTrash,
} from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import LegsViewModal from "./LegsViewModal";
import KnockoutBracketDiagram, { DiagramMatch, DiagramRound, RoundSummary } from "./KnockoutBracketDiagram";

class KnockoutErrorBoundary extends React.Component<
  { children: React.ReactNode; tournamentCode: string; userClubRole: string },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: any) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Knockout component error:", error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <Card className="bg-destructive/10 text-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <IconAlertTriangle className="h-5 w-5" />
              Hiba történt a knockout tábla betöltésekor
            </CardTitle>
            <CardDescription className="text-destructive/80">
              {this.state.error?.message || "Ismeretlen hiba"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-destructive/80">
            <p>Próbáld meg újratölteni az oldalt, vagy generálj új kört az admin felületen.</p>
          </CardContent>
        </Card>
      )
    }

    return this.props.children
  }
}

interface TournamentKnockoutBracketProps {
  tournamentCode: string
  userClubRole: "admin" | "moderator" | "member" | "none"
  tournamentPlayers?: any[]
  knockoutMethod?: "automatic" | "manual"
  clubId?: string
}

interface KnockoutMatch {
  player1: any
  player2: any
  matchReference: {
    player1: {
      legsWon: number
      highestCheckout?: number
      oneEightiesCount?: number
    }
    player2: {
      legsWon: number
      highestCheckout?: number
      oneEightiesCount?: number
    }
    winnerId: string
    _id: string
    status: string
    boardReference: number
    scorer?: { _id: string; name: string }
  }
  player1Name?: string
  player2Name?: string
  player1LegsWon?: number
  player2LegsWon?: number
  winnerId?: string | null
  status?: "pending" | "ongoing" | "finished"
}

interface KnockoutRound {
  round: number
  matches: KnockoutMatch[]
}

const TournamentKnockoutBracketContent: React.FC<TournamentKnockoutBracketProps> = ({
  tournamentCode,
  userClubRole,
  tournamentPlayers = [],
  knockoutMethod,
  clubId,
}) => {
  const isAdmin = userClubRole === "admin" || userClubRole === "moderator"
  const fullscreenContainerRef = useRef<HTMLDivElement>(null)
  const [knockoutData, setKnockoutData] = useState<KnockoutRound[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [showGenerateNextRound, setShowGenerateNextRound] = useState(false)
  const [generatingNextRound, setGeneratingNextRound] = useState(false)
  const [showMatchEditModal, setShowMatchEditModal] = useState(false)
  const [selectedMatch, setSelectedMatch] = useState<KnockoutMatch | null>(null)
  const [showAddMatchModal, setShowAddMatchModal] = useState(false)
  const [selectedRound, setSelectedRound] = useState<number>(1)
  const [selectedPlayer1, setSelectedPlayer1] = useState<string>("")
  const [selectedPlayer2, setSelectedPlayer2] = useState<string>("")
  const [selectedScorer, setSelectedScorer] = useState<string>("")
  const [selectedBoard, setSelectedBoard] = useState<string>("")
  const [addingMatch, setAddingMatch] = useState(false)
  const [editForm, setEditForm] = useState({
    player1LegsWon: 0,
    player2LegsWon: 0,
    player1Stats: { highestCheckout: 0, oneEightiesCount: 0, totalThrows: 0, totalScore: 0 },
    player2Stats: { highestCheckout: 0, oneEightiesCount: 0, totalThrows: 0, totalScore: 0 },
  })
  const [availablePlayers, setAvailablePlayers] = useState<any[]>([])
  const [availableBoards, setAvailableBoards] = useState<any[]>([])
  const [currentKnockoutMethod, setCurrentKnockoutMethod] = useState<"automatic" | "manual" | undefined>(knockoutMethod)
  const [showGenerateEmptyRoundsModal, setShowGenerateEmptyRoundsModal] = useState(false)
  const [roundsToGenerate, setRoundsToGenerate] = useState(2)
  const [generatingEmptyRounds, setGeneratingEmptyRounds] = useState(false)
  const [showRandomPairingModal, setShowRandomPairingModal] = useState(false)
  const [selectedPlayersForPairing, setSelectedPlayersForPairing] = useState<string[]>([])
  const [generatingPairings, setGeneratingPairings] = useState(false)
  const [playerSearchTerm, setPlayerSearchTerm] = useState("")
  const [player1SearchTerm, setPlayer1SearchTerm] = useState("")
  const [player2SearchTerm, setPlayer2SearchTerm] = useState("")
  const [scorerSearchTerm, setScorerSearchTerm] = useState("")
  const [showPlayer1Dropdown, setShowPlayer1Dropdown] = useState(false)
  const [showPlayer2Dropdown, setShowPlayer2Dropdown] = useState(false)
  const [showScorerDropdown, setShowScorerDropdown] = useState(false)
  const [showMatchPlayerEditModal, setShowMatchPlayerEditModal] = useState(false)
  const [editingMatch, setEditingMatch] = useState<KnockoutMatch | null>(null)
  const [updatingMatchPlayer, setUpdatingMatchPlayer] = useState(false)
  const [editPairPlayer1, setEditPairPlayer1] = useState<string>("")
  const [editPairPlayer2, setEditPairPlayer2] = useState<string>("")
  const [editPairScorer, setEditPairScorer] = useState<string>("")
  const [editPairBoard, setEditPairBoard] = useState<string>("")
  const [editPairPlayer1Search, setEditPairPlayer1Search] = useState<string>("")
  const [editPairPlayer2Search, setEditPairPlayer2Search] = useState<string>("")
  const [editPairScorerSearch, setEditPairScorerSearch] = useState<string>("")
  const [showEditPairPlayer1Dropdown, setShowEditPairPlayer1Dropdown] = useState(false)
  const [showEditPairPlayer2Dropdown, setShowEditPairPlayer2Dropdown] = useState(false)
  const [showEditPairScorerDropdown, setShowEditPairScorerDropdown] = useState(false)
  const [showLegsModal, setShowLegsModal] = useState(false)
  const [selectedMatchForLegs, setSelectedMatchForLegs] = useState<KnockoutMatch | null>(null)
  const [showMatchSettingsModal, setShowMatchSettingsModal] = useState(false)
  const [editingMatchSettings, setEditingMatchSettings] = useState<KnockoutMatch | null>(null)
  const [editSettingsLoading, setEditSettingsLoading] = useState(false)
  const [zoomLevel, setZoomLevel] = useState(1)
  const [showDeleteMatchModal, setShowDeleteMatchModal] = useState(false)
  const [matchToDelete, setMatchToDelete] = useState<{ match: KnockoutMatch; round: number; index: number } | null>(null)
  const [deletingMatch, setDeletingMatch] = useState(false)
  const [showDeleteLastRoundModal, setShowDeleteLastRoundModal] = useState(false)
  const [deletingLastRound, setDeletingLastRound] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [tournamentStatus, setTournamentStatus] = useState<string | null>(null)

  useEffect(() => {
    fetchKnockoutData()
    fetchAvailableBoards()
  }, [tournamentCode])

  useEffect(() => {
    if (tournamentPlayers && tournamentPlayers.length > 0) {
      setAvailablePlayers(tournamentPlayers)
    } else {
      fetchTournamentPlayers()
    }
  }, [tournamentPlayers])

  useEffect(() => {
    if (!knockoutMethod) {
      fetchKnockoutMethod()
    } else {
      setCurrentKnockoutMethod(knockoutMethod)
    }
  }, [knockoutMethod])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isFullscreen) {
        if (document.fullscreenElement) {
          void document.exitFullscreen().catch(() => setIsFullscreen(false))
        } else {
          setIsFullscreen(false)
        }
      }
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [isFullscreen])

  useEffect(() => {
    const handleFullscreenChange = () => {
      const active = Boolean(document.fullscreenElement)
      setIsFullscreen(active)
    }
    document.addEventListener("fullscreenchange", handleFullscreenChange)
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange)
  }, [])

  useEffect(() => {
    if (isFullscreen) {
      const originalOverflow = document.body.style.overflow
      document.body.style.overflow = "hidden"
      return () => {
        document.body.style.overflow = originalOverflow
      }
    }
    document.body.style.overflow = ""
    return () => {
      document.body.style.overflow = ""
    }
  }, [isFullscreen])

  const toggleFullscreen = async () => {
    if (isFullscreen) {
      if (document.fullscreenElement) {
        try {
          await document.exitFullscreen()
          setIsFullscreen(false)
        } catch (err) {
          console.error("Failed to exit fullscreen", err)
        }
      } else {
        setIsFullscreen(false)
      }
      return
    }

    const node = fullscreenContainerRef.current
    if (node && node.requestFullscreen) {
      try {
        await node.requestFullscreen({ navigationUI: "hide" })
        setIsFullscreen(true)
      } catch (err) {
        console.error("Failed to enter fullscreen", err)
        setIsFullscreen(false)
      }
    } else {
      setIsFullscreen(true)
    }
  }

  const roundsWithMatches = useMemo(
    () => knockoutData.filter((round) => currentKnockoutMethod === "manual" || (round.matches && round.matches.length > 0)),
    [knockoutData, currentKnockoutMethod]
  )

  const filteredPlayers = useMemo(() => {
    const term = playerSearchTerm.toLowerCase()
    return availablePlayers.filter((player: any) => {
      const playerName = player.playerReference?.name || player.name || ""
      return playerName.toLowerCase().includes(term)
    })
  }, [availablePlayers, playerSearchTerm])

  const fetchKnockoutMethod = async () => {
    try {
      const response = await axios.get(`/api/tournaments/${tournamentCode}/knockoutMethod`)
      if (response.data?.success) {
        setCurrentKnockoutMethod(response.data.knockoutMethod)
      }
    } catch (err) {
      console.error("Failed to fetch knockout method", err)
      setCurrentKnockoutMethod("automatic")
    }
  }

  const fetchTournamentPlayers = async () => {
    try {
      const response = await axios.get(`/api/tournaments/${tournamentCode}`)
      if (response.data?.tournamentPlayers) {
        setAvailablePlayers(response.data.tournamentPlayers)
      }
      const statusFromResponse =
        response.data?.tournament?.tournamentSettings?.status || response.data?.tournament?.status || response.data?.status || null
      if (statusFromResponse) {
        setTournamentStatus(statusFromResponse as string)
      }
    } catch (err) {
      console.error("Failed to fetch tournament players", err)
    }
  }

  const fetchAvailableBoards = async () => {
    try {
      const response = await axios.get(`/api/tournaments/${tournamentCode}/board-context`)
      if (response.data?.availableBoards) {
        setAvailableBoards(response.data.availableBoards)
      }
    } catch (err) {
      console.error("Failed to fetch available boards", err)
    }
  }

  const fetchKnockoutData = async () => {
    setLoading(true)
    setError("")
    try {
      const response = await axios.get(`/api/tournaments/${tournamentCode}/knockout`)
      if (response.data?.success) {
        const knockoutRounds = response.data.knockout || []
        knockoutRounds.forEach((round: any) => {
          if (!round.matches) {
            round.matches = []
          }
        })
        setKnockoutData(knockoutRounds)
        const statusFromKnockout =
          response.data?.tournament?.tournamentSettings?.status || response.data?.tournament?.status || response.data?.status || null
        if (statusFromKnockout) {
          setTournamentStatus(statusFromKnockout as string)
        }
      } else {
        setError(response.data?.error || "Nem sikerült betölteni a knockout adatokat.")
      }
    } catch (err: any) {
      console.error("Error fetching knockout data", err)
      setError(err.response?.data?.error || "Nem sikerült betölteni a knockout adatokat.")
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateNextRound = async () => {
    if (knockoutData.length === 0) return
    const rounds = knockoutData.filter((round) => round.matches && round.matches.length > 0)
    if (rounds.length === 0) return

    const currentRound = rounds[rounds.length - 1].round
    setGeneratingNextRound(true)
    setError("")

    try {
      const response = await axios.post(`/api/tournaments/${tournamentCode}/generateNextRound`, { currentRound })
      if (response.data?.success) {
        await fetchKnockoutData()
        setShowGenerateNextRound(false)
      } else {
        setError(response.data?.error || "Nem sikerült generálni a következő kört.")
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Nem sikerült generálni a következő kört.")
    } finally {
      setGeneratingNextRound(false)
    }
  }

  const handleMatchEdit = (match: KnockoutMatch) => {
    if (!match.matchReference || !match.player1 || !match.player2) {
      setError("Bye meccseket nem lehet szerkeszteni - automatikusan befejeződnek.")
      return
    }

    setSelectedMatch(match)
    setEditForm({
      player1LegsWon: match.matchReference?.player1?.legsWon || 0,
      player2LegsWon: match.matchReference?.player2?.legsWon || 0,
      player1Stats: {
        highestCheckout: match.matchReference?.player1?.highestCheckout || 0,
        oneEightiesCount: match.matchReference?.player1?.oneEightiesCount || 0,
        totalThrows: 0,
        totalScore: 0,
      },
      player2Stats: {
        highestCheckout: match.matchReference?.player2?.highestCheckout || 0,
        oneEightiesCount: match.matchReference?.player2?.oneEightiesCount || 0,
        totalThrows: 0,
        totalScore: 0,
      },
    })
    setShowMatchEditModal(true)
  }

  const handleSaveMatch = async () => {
    if (!selectedMatch || !selectedMatch.matchReference) {
      setError("Nem lehet menteni a meccset.")
      return
    }

    try {
      const matchId =
        typeof selectedMatch.matchReference === "object"
          ? selectedMatch.matchReference._id
          : selectedMatch.matchReference
      const response = await axios.post(`/api/matches/${matchId}/finish`, editForm)
      if (response.data?.success) {
        await fetchKnockoutData()
        setShowMatchEditModal(false)
        setSelectedMatch(null)
      } else {
        setError(response.data?.error || "Nem sikerült frissíteni a meccset.")
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Nem sikerült frissíteni a meccset.")
    }
  }

  const handleAddMatch = async () => {
    if (selectedPlayer1 && selectedPlayer2 && selectedPlayer1 === selectedPlayer2) {
      setError("Kérjük válassz ki két különböző játékost.")
      return
    }

    if ((selectedPlayer1 || selectedPlayer2) && !selectedBoard) {
      setError("Kérjük válassz ki egy táblát ha játékosokat adsz hozzá.")
      return
    }

    setAddingMatch(true)
    setError("")

    try {
      const response = await axios.post(`/api/tournaments/${tournamentCode}/addManualMatch`, {
        round: selectedRound,
        player1Id: selectedPlayer1 || undefined,
        player2Id: selectedPlayer2 || undefined,
        scorerId: selectedScorer || undefined,
        boardNumber: selectedBoard ? parseInt(selectedBoard) : undefined,
      })

      if (response.data?.success) {
        await fetchKnockoutData()
        setShowAddMatchModal(false)
        setSelectedPlayer1("")
        setSelectedPlayer2("")
        setSelectedScorer("")
        setSelectedBoard("")
        setPlayer1SearchTerm("")
        setPlayer2SearchTerm("")
        setScorerSearchTerm("")
        setShowPlayer1Dropdown(false)
        setShowPlayer2Dropdown(false)
        setShowScorerDropdown(false)
      } else {
        setError(response.data?.error || "Nem sikerült hozzáadni a meccset.")
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Nem sikerült hozzáadni a meccset.")
    } finally {
      setAddingMatch(false)
    }
  }

  const handleGenerateEmptyRounds = async () => {
    setGeneratingEmptyRounds(true)
    setError("")
    try {
      const response = await axios.post(`/api/tournaments/${tournamentCode}/generateEmptyRounds`, {
        roundsCount: roundsToGenerate,
      })
      if (response.data?.success) {
        await fetchKnockoutData()
        setShowGenerateEmptyRoundsModal(false)
      } else {
        setError(response.data?.error || "Nem sikerült generálni az üres köröket.")
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Nem sikerült generálni az üres köröket.")
    } finally {
      setGeneratingEmptyRounds(false)
    }
  }

  const handleGenerateRandomPairings = async () => {
    if (selectedPlayersForPairing.length < 2) {
      setError("Kérjük válassz ki legalább 2 játékost.")
      return
    }

    setGeneratingPairings(true)
    setError("")

    try {
      const response = await axios.post(`/api/tournaments/${tournamentCode}/generateRandomPairings`, {
        round: selectedRound,
        selectedPlayerIds: selectedPlayersForPairing,
      })
      if (response.data?.success) {
        await fetchKnockoutData()
        setShowRandomPairingModal(false)
        setSelectedPlayersForPairing([])
      } else {
        setError(response.data?.error || "Nem sikerült generálni a párosításokat.")
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Nem sikerült generálni a párosításokat.")
    } finally {
      setGeneratingPairings(false)
    }
  }

  const handlePlayerSelectionForPairing = (playerId: string) => {
    setSelectedPlayersForPairing((prev) =>
      prev.includes(playerId) ? prev.filter((id) => id !== playerId) : [...prev, playerId]
    )
  }

  const handleSaveMatchSettings = async () => {
    if (!editingMatchSettings || !editingMatchSettings.matchReference) return

    setEditSettingsLoading(true)
    setError("")

    try {
      const matchId =
        typeof editingMatchSettings.matchReference === "object"
          ? editingMatchSettings.matchReference._id
          : editingMatchSettings.matchReference

      const response = await axios.post(`/api/matches/${matchId}/update-settings`, {
        player1Id: selectedPlayer1 || null,
        player2Id: selectedPlayer2 || null,
        scorerId: selectedScorer || undefined,
        boardNumber: selectedBoard ? parseInt(selectedBoard) : undefined,
      })

      if (response.data?.success) {
        await fetchKnockoutData()
        setShowMatchSettingsModal(false)
        setEditingMatchSettings(null)
        setSelectedPlayer1("")
        setSelectedPlayer2("")
        setSelectedScorer("")
        setSelectedBoard("")
        setPlayer1SearchTerm("")
        setPlayer2SearchTerm("")
        setScorerSearchTerm("")
        setShowPlayer1Dropdown(false)
        setShowPlayer2Dropdown(false)
        setShowScorerDropdown(false)
      } else {
        setError(response.data?.error || "Nem sikerült frissíteni a meccs beállításait.")
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Nem sikerült frissíteni a meccs beállításait.")
    } finally {
      setEditSettingsLoading(false)
    }
  }

  const handleUpdateMatchPlayer = async () => {
    if (!editingMatch) {
      toast.error("Nem lehet frissíteni a meccset.")
      return
    }

    const isNewMatch = !editingMatch.matchReference
    if (isNewMatch && !editPairPlayer1 && !editPairPlayer2) {
      toast.error("Kérjük válassz ki legalább egy játékost!")
      return
    }

    if (isNewMatch && (editPairPlayer1 || editPairPlayer2) && !editPairBoard) {
      toast.error("Kérjük válassz ki egy táblát!")
      return
    }

    setUpdatingMatchPlayer(true)
    try {
      if (!editingMatch.matchReference) {
        let matchRound = 1
        let pairIndex = 0
        for (const round of knockoutData) {
          const idx = round.matches.findIndex((m) => m === editingMatch)
          if (idx !== -1) {
            matchRound = round.round
            pairIndex = idx
            break
          }
        }

        const response = await axios.post(`/api/tournaments/${tournamentCode}/updateEmptyPair`, {
          round: matchRound,
          pairIndex,
          player1Id: editPairPlayer1 || undefined,
          player2Id: editPairPlayer2 || undefined,
          scorerId: editPairScorer || undefined,
          boardNumber: editPairBoard ? parseInt(editPairBoard) : undefined,
        })

        if (response.data?.success) {
          await fetchKnockoutData()
          toast.success("Meccs sikeresen létrehozva!")
          setShowMatchPlayerEditModal(false)
          resetEditPairState()
        } else {
          toast.error(response.data?.error || "Nem sikerült létrehozni a meccset.")
        }
      } else {
        const matchId =
          typeof editingMatch.matchReference === "object"
            ? editingMatch.matchReference._id
            : editingMatch.matchReference

        const response = await axios.post(`/api/matches/${matchId}/update-settings`, {
          player1Id: editPairPlayer1 || null,
          player2Id: editPairPlayer2 || null,
          scorerId: editPairScorer || undefined,
          boardNumber: editPairBoard ? parseInt(editPairBoard) : undefined,
        })

        if (response.data?.success) {
          await fetchKnockoutData()
          toast.success("Meccs sikeresen frissítve!")
          setShowMatchPlayerEditModal(false)
          resetEditPairState()
        } else {
          toast.error(response.data?.error || "Nem sikerült frissíteni a meccset.")
        }
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Nem sikerült frissíteni a meccset.")
    } finally {
      setUpdatingMatchPlayer(false)
    }
  }

  const handleViewLegs = (match: KnockoutMatch) => {
    if (!match.matchReference) {
      setError("Bye meccsekhez nincsenek legek.")
      return
    }
    setSelectedMatchForLegs(match)
    setShowLegsModal(true)
  }

  const handleDeleteMatch = async () => {
    if (!matchToDelete) return
    setDeletingMatch(true)
    try {
      const response = await axios.post(`/api/tournaments/${tournamentCode}/deleteMatch`, {
        round: matchToDelete.round,
        pairIndex: matchToDelete.index,
      })
      if (response.data?.success) {
        await fetchKnockoutData()
        toast.success("Meccs sikeresen törölve!")
        setShowDeleteMatchModal(false)
        setMatchToDelete(null)
      } else {
        toast.error(response.data?.error || "Nem sikerült törölni a meccset.")
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Nem sikerült törölni a meccset.")
    } finally {
      setDeletingMatch(false)
    }
  }

  const handleDeleteLastRound = async () => {
    setDeletingLastRound(true)
    try {
      const response = await axios.post(`/api/tournaments/${tournamentCode}/deleteLastRound`)
      if (response.data?.success) {
        await fetchKnockoutData()
        toast.success("Utolsó kör sikeresen törölve!")
        setShowDeleteLastRoundModal(false)
      } else {
        toast.error(response.data?.error || "Nem sikerült törölni az utolsó kört.")
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Nem sikerült törölni az utolsó kört.")
    } finally {
      setDeletingLastRound(false)
    }
  }

  const resetEditPairState = () => {
    setEditingMatch(null)
    setEditPairPlayer1("")
    setEditPairPlayer2("")
    setEditPairScorer("")
    setEditPairBoard("")
    setEditPairPlayer1Search("")
    setEditPairPlayer2Search("")
    setEditPairScorerSearch("")
  }

  const formatBoardDisplay = (boardNumber?: number, name?: string) => {
    if (!boardNumber) return "Bye meccs"
    if (name && name !== `Tábla ${boardNumber}`) {
      return name
    }
    return `Tábla ${boardNumber}`
  }

  const getAvailablePlayersForSelection = (searchTerm: string, players: any[]) => {
    const term = searchTerm.toLowerCase()
    return players.filter((player: any) => {
      const playerName = player.playerReference?.name || player.name || ""
      return playerName.toLowerCase().includes(term)
    })
  }

  const getAllTournamentPlayers = () => availablePlayers

  const getAvailablePlayersForRound = (roundNumber: number) => {
    const playersInRound = new Set<string>()
    const playersInPreviousRounds = new Set<string>()
    const losersInPreviousRounds = new Set<string>()
    const byePlayersInPreviousRounds = new Set<string>()
    const winnersInPreviousRounds = new Set<string>()

    const editingPlayerIds = new Set<string>()
    if (editingMatch) {
      if (editingMatch.player1) {
        const id = editingMatch.player1._id || editingMatch.player1
        if (id) editingPlayerIds.add(id.toString())
      }
      if (editingMatch.player2) {
        const id = editingMatch.player2._id || editingMatch.player2
        if (id) editingPlayerIds.add(id.toString())
      }
    }

    const roundData = knockoutData.find((round) => round.round === roundNumber)
    roundData?.matches.forEach((match) => {
      const isEditingThisMatch = editingMatch && (match === editingMatch || match.matchReference?._id === editingMatch.matchReference?._id)
      if (isEditingThisMatch) return
      const p1 = match.player1?._id || match.player1
      const p2 = match.player2?._id || match.player2
      if (p1) playersInRound.add(p1.toString())
      if (p2) playersInRound.add(p2.toString())
    })

    knockoutData.forEach((round) => {
      if (round.round < roundNumber) {
        round.matches.forEach((match) => {
          const p1 = match.player1?._id || match.player1
          const p2 = match.player2?._id || match.player2
          if (p1) playersInPreviousRounds.add(p1.toString())
          if (p2) playersInPreviousRounds.add(p2.toString())

          if (!match.player2 && match.player1) {
            const byeId = match.player1._id || match.player1
            if (byeId) {
              byePlayersInPreviousRounds.add(byeId.toString())
              winnersInPreviousRounds.add(byeId.toString())
            }
          }

          if (match.matchReference && match.player2 && match.matchReference.status === "finished" && match.matchReference.winnerId) {
            const winnerId = match.matchReference.winnerId.toString()
            if (p1) {
              if (p1.toString() === winnerId) {
                winnersInPreviousRounds.add(p1.toString())
              } else {
                losersInPreviousRounds.add(p1.toString())
              }
            }
            if (p2) {
              if (p2.toString() === winnerId) {
                winnersInPreviousRounds.add(p2.toString())
              } else {
                losersInPreviousRounds.add(p2.toString())
              }
            }
          }
        })
      }
    })

    return availablePlayers.filter((player: any) => {
      const playerId = (player.playerReference?._id || player.playerReference || player._id)?.toString()
      if (!playerId) return false
      if (playersInRound.has(playerId)) return false
      if (losersInPreviousRounds.has(playerId)) return false

      if (roundNumber === 1) {
        return !playersInPreviousRounds.has(playerId) || editingPlayerIds.has(playerId)
      }

      if (playersInPreviousRounds.has(playerId)) {
        return winnersInPreviousRounds.has(playerId) || byePlayersInPreviousRounds.has(playerId) || editingPlayerIds.has(playerId)
      }

      return true
    })
  }

  const getRoundTitle = (roundIndex: number, matchCount: number, totalRounds: number) => {
    if (roundIndex === totalRounds - 1 && matchCount === 1) return "Döntő"
    if (roundIndex === totalRounds - 2 && matchCount === 2) return "Elődöntő"
    if (roundIndex === totalRounds - 3 && matchCount === 4) return "Negyeddöntő"
    return `${roundIndex + 1}. kör`
  }

  const determineMatchWinner = (match: KnockoutMatch): "team1" | "team2" | null => {
    const player1Id = match.player1?._id || match.player1
    const player2Id = match.player2?._id || match.player2
    const winnerId = match.matchReference?.winnerId
    if (winnerId) {
      if (player1Id && winnerId.toString() === player1Id.toString()) return "team1"
      if (player2Id && winnerId.toString() === player2Id.toString()) return "team2"
    }

    const score1 = match.matchReference?.player1?.legsWon
    const score2 = match.matchReference?.player2?.legsWon
    if (typeof score1 === "number" && typeof score2 === "number" && score1 !== score2) {
      return score1 > score2 ? "team1" : "team2"
    }

    return null
  }

  const bracketRounds: DiagramRound[] = useMemo(() => {
    if (!roundsWithMatches || roundsWithMatches.length === 0) {
      return []
    }

    return roundsWithMatches.map((round, roundIndex) =>
      round.matches.map((match, matchIndex) => {
        const team1Name = match.player1?.name || "TBD"
        const team2Name = match.player2?.name || "TBD"
        const score1 = match.matchReference?.player1?.legsWon ?? null
        const score2 = match.matchReference?.player2?.legsWon ?? null
        const boardRef = match.matchReference?.boardReference
        const board = boardRef ? availableBoards.find((board: any) => board.boardNumber === boardRef) : undefined
        const boardLabel = boardRef ? formatBoardDisplay(boardRef, board?.name) : undefined

        return {
          id: match.matchReference?._id || `round-${round.round}-match-${matchIndex}`,
          team1: team1Name,
          team2: team2Name,
          score1,
          score2,
          winner: determineMatchWinner(match),
          status: match.matchReference?.status || null,
          meta: { match, round, roundIndex, matchIndex, boardLabel },
        } as DiagramMatch
      })
    )
  }, [roundsWithMatches, availableBoards])

  const roundSummaries: RoundSummary[] = useMemo(() => {
    if (!roundsWithMatches || roundsWithMatches.length === 0) {
      return []
    }
    return roundsWithMatches.map((round, index) => ({
      label: getRoundTitle(index, round.matches?.length || 0, roundsWithMatches.length),
      roundNumber: round.round,
      canAdd: isAdmin && currentKnockoutMethod === "manual",
    }))
  }, [roundsWithMatches, currentKnockoutMethod, isAdmin])

  const isTournamentLocked = tournamentStatus === "finished" || tournamentStatus === "archived" || tournamentStatus === "cancelled"

  const knockoutHasStarted = useMemo(
    () =>
      knockoutData.some((round) =>
        round.matches?.some((match) => {
          const status = match.matchReference?.status
          const hasPlayers = Boolean(match.player1 || match.player2)
          return hasPlayers || (status && status !== "pending")
        })
      ),
    [knockoutData]
  )

  const openMatchPlayerEditor = (match: KnockoutMatch, round: KnockoutRound) => {
    const status = match.matchReference?.status
    const hasPlayers = Boolean(match.player1 && match.player2)
    if (isTournamentLocked) return
    if (status === "finished" && hasPlayers) return

    resetEditPairState()
    setEditingMatch(match)
    setSelectedRound(round.round)

    const player1Id = match.player1?._id || match.player1 || ""
    if (player1Id) {
      setEditPairPlayer1(player1Id.toString())
      setEditPairPlayer1Search(match.player1?.name || match.player1Name || "")
    }

    const player2Id = match.player2?._id || match.player2 || ""
    if (player2Id) {
      setEditPairPlayer2(player2Id.toString())
      setEditPairPlayer2Search(match.player2?.name || match.player2Name || "")
    }

    const scorerId = match.matchReference?.scorer?._id || match.matchReference?.scorer || ""
    if (scorerId) {
      setEditPairScorer(scorerId.toString())
      setEditPairScorerSearch(match.matchReference?.scorer?.name || "")
    }

    const boardNumber = match.matchReference?.boardReference
    if (boardNumber) {
      setEditPairBoard(boardNumber.toString())
    }

    setShowMatchPlayerEditModal(true)
  }

  if (loading) {
    return (
      <Card className="bg-card/90 shadow-lg shadow-black/35">
        <CardContent className="flex items-center justify-center py-12">
          <div className="flex items-center gap-3 text-muted-foreground">
            <IconRefresh className="h-5 w-5 animate-spin" />
            Betöltés...
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive" className="bg-destructive/10 text-destructive">
        <AlertTitle className="flex items-center gap-2">
          <IconAlertTriangle className="h-5 w-5" />
          Hiba történt
        </AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  if (!knockoutData || knockoutData.length === 0) {
    return (
      <Card className="bg-card/92 shadow-lg shadow-black/35">
        <CardContent className="py-12 text-center text-muted-foreground">
          Még nincs knockout tábla generálva.
        </CardContent>
      </Card>
    )
  }

  const fullscreenWrapperClasses = cn(
    "relative rounded-3xl border-0 bg-card/90 shadow-xl shadow-black/40",
    isFullscreen
      ? "z-50 flex h-[100dvh] w-full max-w-none flex-col overflow-auto bg-card/96"
      : ""
  )

  const renderDiagramMatchActions = (diagramMatch: DiagramMatch) => {
    const rawMatch = diagramMatch.meta?.match as KnockoutMatch | undefined
    const rawRound = diagramMatch.meta?.round as KnockoutRound | undefined

    if (!rawMatch || !rawRound) return null

    const hasPlayers = Boolean(rawMatch.player1 && rawMatch.player2)
    const status = rawMatch.matchReference?.status

    const finishedMatch = status === "finished" && hasPlayers
    const allowSettings = !isTournamentLocked && (!finishedMatch || !hasPlayers)
    const allowResultEdit = !isTournamentLocked && status !== "finished"
    const allowDelete = allowSettings && currentKnockoutMethod === "manual"

    return (
      <div className="flex flex-wrap gap-1.5">
        {status !== "pending" && hasPlayers ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 rounded-full text-muted-foreground hover:bg-primary/15 hover:text-primary"
                onClick={() => handleViewLegs(rawMatch)}
                aria-label="Legek megtekintése"
              >
                <IconChartHistogram className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Legek</TooltipContent>
          </Tooltip>
        ) : null}

        {isAdmin && allowSettings ? (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 rounded-full text-muted-foreground hover:bg-muted/20"
                  onClick={() => openMatchPlayerEditor(rawMatch, rawRound)}
                  aria-label="Meccs beállítások"
                >
                  <IconSettings className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">Beállítások</TooltipContent>
            </Tooltip>

            {rawMatch.matchReference && hasPlayers && allowResultEdit ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 rounded-full text-muted-foreground hover:bg-muted/20"
                    onClick={() => handleMatchEdit(rawMatch)}
                    aria-label="Eredmény rögzítése"
                  >
                    <IconClipboardList className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">Eredmény</TooltipContent>
              </Tooltip>
            ) : null}

            {allowDelete ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 rounded-full text-destructive hover:bg-destructive/15"
                    onClick={() => {
                      setMatchToDelete({ match: rawMatch, round: rawRound.round, index: diagramMatch.meta?.matchIndex ?? 0 })
                      setShowDeleteMatchModal(true)
                    }}
                    aria-label="Meccs törlése"
                  >
                    <IconTrash className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">Meccs törlése</TooltipContent>
              </Tooltip>
            ) : null}
          </>
        ) : null}
      </div>
    )
  }

  const handleAddMatchForRound = (roundNumber: number) => {
    setSelectedRound(roundNumber)
    setShowAddMatchModal(true)
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div ref={fullscreenContainerRef} className={fullscreenWrapperClasses}>
          <div className="flex flex-col gap-4 border-b border-border/40 p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-2">
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <IconHierarchy className="h-6 w-6 text-primary" />
                  Egyenes kiesés
                </CardTitle>
                <CardDescription>
                  Kövesd a kieséses ág párosításait, eredményeit és adminisztráld a meccseket.
                </CardDescription>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-sm">
                <div className="flex items-center gap-2 rounded-full bg-muted/20 px-3 py-1 font-mono text-xs text-muted-foreground">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setZoomLevel((prev) => Math.max(0.6, +(prev - 0.1).toFixed(2)))}
                    title="Kicsinyítés"
                  >
                    <IconMinus className="h-4 w-4" />
                  </Button>
                  <span className="w-12 text-center">{Math.round(zoomLevel * 100)}%</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setZoomLevel((prev) => Math.min(1.6, +(prev + 0.1).toFixed(2)))}
                    title="Nagyítás"
                  >
                    <IconPlus className="h-4 w-4" />
                  </Button>
                  <Separator orientation="vertical" className="h-6 bg-border/60" />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setZoomLevel(1)}
                    title="Alaphelyzet"
                  >
                    <IconRefresh className="h-4 w-4" />
                  </Button>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={toggleFullscreen}
                >
                  {isFullscreen ? (
                    <>
                      <IconPlayerPause className="h-4 w-4" />
                      Kilépés teljes képernyőből
                    </>
                  ) : (
                    <>
                      <IconPlayerPlay className="h-4 w-4" />
                      Teljes képernyő
                    </>
                  )}
                </Button>

                <Button variant="outline" size="sm" className="gap-2" onClick={fetchKnockoutData}>
                  <IconRefresh className="h-4 w-4" />
                  Frissítés
                </Button>
              </div>
            </div>

            {isAdmin && (
              <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-wrap gap-2">
                  {currentKnockoutMethod === "manual" && !isTournamentLocked && (
                    <>
                      <Button
                        variant="outline"
                        className="gap-2"
                        onClick={() => setShowGenerateEmptyRoundsModal(true)}
                        disabled={generatingEmptyRounds}
                      >
                        <IconPlus className="h-4 w-4" />
                        Üres kör generálása
                      </Button>
                      {!knockoutHasStarted && (
                        <Button
                          variant="outline"
                          className="gap-2"
                          onClick={() => {
                            setSelectedRound(roundsWithMatches[0]?.round || 1)
                            setShowRandomPairingModal(true)
                          }}
                          disabled={generatingPairings}
                        >
                          <IconHierarchy className="h-4 w-4" />
                          Random párosítás
                        </Button>
                      )}
                    </>
                  )}
                  {roundsWithMatches.length > 0 && !isTournamentLocked && (
                    <Button
                      className="gap-2"
                      onClick={() => setShowGenerateNextRound(true)}
                      disabled={generatingNextRound || roundsWithMatches.some((round) => round.matches?.some((match) => match.matchReference?.status !== "finished"))}
                    >
                      <IconChevronRight className="h-4 w-4" />
                      Következő kör generálása
                    </Button>
                  )}
                  {currentKnockoutMethod === "manual" && roundsWithMatches.length > 0 && !isTournamentLocked && (
                    <Button
                      variant="destructive"
                      className="gap-2"
                      onClick={() => setShowDeleteLastRoundModal(true)}
                    >
                      <IconTrash className="h-4 w-4" />
                      Utolsó kör visszavonása
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Módszer: {currentKnockoutMethod === "manual" ? "manuális párosítás" : "automatikus"}
                </p>
              </div>
            )}
          </div>

          <ScrollArea className={cn("relative w-full", isFullscreen ? "flex-1" : "")}>
            <div className="relative min-w-max px-6 pt-20 pb-6">
              <div
                className="origin-top-left"
                style={{ transform: `scale(${zoomLevel})`, transformOrigin: "top left" }}
              >
                <KnockoutBracketDiagram
                  rounds={bracketRounds}
                  renderMatchActions={renderDiagramMatchActions}
                  roundSummaries={roundSummaries}
                  onAddMatchToRound={currentKnockoutMethod === "manual" ? handleAddMatchForRound : undefined}
                />
              </div>
            </div>
            <ScrollBar orientation="horizontal" className="h-3" />
          </ScrollArea>
        </div>

        {/* Dialogs */}
        <Dialog open={showGenerateNextRound} onOpenChange={setShowGenerateNextRound}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Következő kör generálása</DialogTitle>
              <DialogDescription>
                Biztosan generálni szeretnéd a következő kört? A befejezett meccsek győztesei automatikusan továbbjutnak.
              </DialogDescription>
            </DialogHeader>
            {currentKnockoutMethod === "manual" && (
              <Alert className="bg-primary/10 text-primary">
                <AlertTitle>Megjegyzés manuális módhoz</AlertTitle>
                <AlertDescription>
                  Bye meccsek esetén az egyedül maradt játékos automatikusan továbbjut. Páratlan játékos számnál az utolsó játékos kap bye-t.
                </AlertDescription>
              </Alert>
            )}
            <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={() => setShowGenerateNextRound(false)} disabled={generatingNextRound}>
                Mégse
              </Button>
              <Button onClick={handleGenerateNextRound} disabled={generatingNextRound}>
                {generatingNextRound ? "Generálás..." : "Generálás"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showGenerateEmptyRoundsModal} onOpenChange={setShowGenerateEmptyRoundsModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Üres körök generálása</DialogTitle>
              <DialogDescription>Adj meg hány üres kört szeretnél létrehozni a manuális párosításhoz.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <Label htmlFor="roundsToGenerate">Körök száma</Label>
              <Input
                id="roundsToGenerate"
                type="number"
                min={1}
                max={10}
                value={roundsToGenerate}
                onChange={(event) => setRoundsToGenerate(Number(event.target.value) || 1)}
              />
            </div>
            <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={() => setShowGenerateEmptyRoundsModal(false)} disabled={generatingEmptyRounds}>
                Mégse
              </Button>
              <Button onClick={handleGenerateEmptyRounds} disabled={generatingEmptyRounds}>
                {generatingEmptyRounds ? "Generálás..." : "Generálás"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showRandomPairingModal} onOpenChange={setShowRandomPairingModal}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Random párosítás</DialogTitle>
              <DialogDescription>
                Válaszd ki a játékosokat, akiket szeretnél párosítani a {selectedRound}. körben. Minimum két játékos szükséges.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="playerSearch">Játékos keresése</Label>
                <Input
                  id="playerSearch"
                  value={playerSearchTerm}
                  onChange={(event) => setPlayerSearchTerm(event.target.value)}
                  placeholder="Játékos neve..."
                  className="mt-2"
                />
              </div>
              <ScrollArea className="h-60 rounded-xl border border-border/40 bg-card/80 p-3">
                <div className="space-y-2">
                  {filteredPlayers.map((player: any) => {
                    const playerId = player.playerReference?._id || player.playerReference || player._id
                    const playerName = player.playerReference?.name || player.name || "Ismeretlen játékos"
                    const selected = selectedPlayersForPairing.includes(playerId)
                    return (
                      <button
                        key={playerId}
                        type="button"
                        onClick={() => handlePlayerSelectionForPairing(playerId)}
                        className={cn(
                          "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm",
                          selected
                            ? "bg-primary/15 text-primary"
                            : "bg-muted/15 text-foreground hover:bg-muted/25"
                        )}
                      >
                        <span>{playerName}</span>
                        {selected ? <IconCheck className="h-4 w-4" /> : null}
                      </button>
                    )
                  })}
                </div>
                <ScrollBar orientation="vertical" />
              </ScrollArea>
            </div>
            <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowRandomPairingModal(false)
                  setSelectedPlayersForPairing([])
                  setPlayerSearchTerm("")
                }}
                disabled={generatingPairings}
              >
                Mégse
              </Button>
              <Button onClick={handleGenerateRandomPairings} disabled={generatingPairings || selectedPlayersForPairing.length < 2}>
                {generatingPairings ? "Párosítás..." : `Párosítás (${selectedPlayersForPairing.length})`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showAddMatchModal} onOpenChange={setShowAddMatchModal}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Meccs hozzáadása</DialogTitle>
              <DialogDescription>{selectedRound}. kör</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid gap-3">
                <Label>Első játékos</Label>
                <Input
                  placeholder="Keresés..."
                  value={player1SearchTerm}
                  onChange={(event) => {
                    setPlayer1SearchTerm(event.target.value)
                    setShowPlayer1Dropdown(event.target.value.length > 0)
                  }}
                  onBlur={() => setTimeout(() => setShowPlayer1Dropdown(false), 150)}
                  onFocus={() => player1SearchTerm && setShowPlayer1Dropdown(true)}
                />
                {showPlayer1Dropdown && (
                  <Card className="max-h-48 overflow-y-auto bg-card/95">
                    <CardContent className="p-0">
                      <div className="divide-y divide-border/30">
                        {getAvailablePlayersForSelection(player1SearchTerm, getAvailablePlayersForRound(selectedRound)).map((player: any) => {
                          const playerId = player.playerReference?._id || player.playerReference || player._id
                          const playerName = player.playerReference?.name || player.name || "Ismeretlen játékos"
                          return (
                            <button
                              key={playerId}
                              type="button"
                              onClick={() => {
                                setSelectedPlayer1(playerId)
                                setPlayer1SearchTerm(playerName)
                                setShowPlayer1Dropdown(false)
                              }}
                              className="w-full px-3 py-2 text-left text-sm hover:bg-muted/20"
                            >
                              {playerName}
                            </button>
                          )
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              <div className="grid gap-3">
                <Label>Második játékos</Label>
                <Input
                  placeholder="Keresés..."
                  value={player2SearchTerm}
                  onChange={(event) => {
                    setPlayer2SearchTerm(event.target.value)
                    setShowPlayer2Dropdown(event.target.value.length > 0)
                  }}
                  onBlur={() => setTimeout(() => setShowPlayer2Dropdown(false), 150)}
                  onFocus={() => player2SearchTerm && setShowPlayer2Dropdown(true)}
                />
                {showPlayer2Dropdown && (
                  <Card className="max-h-48 overflow-y-auto bg-card/95">
                    <CardContent className="p-0">
                      <div className="divide-y divide-border/30">
                        {getAvailablePlayersForSelection(player2SearchTerm, getAvailablePlayersForRound(selectedRound)).map((player: any) => {
                          const playerId = player.playerReference?._id || player.playerReference || player._id
                          const playerName = player.playerReference?.name || player.name || "Ismeretlen játékos"
                          return (
                            <button
                              key={playerId}
                              type="button"
                              onClick={() => {
                                setSelectedPlayer2(playerId)
                                setPlayer2SearchTerm(playerName)
                                setShowPlayer2Dropdown(false)
                              }}
                              className="w-full px-3 py-2 text-left text-sm hover:bg-muted/20"
                            >
                              {playerName}
                            </button>
                          )
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              <div className="grid gap-3">
                <Label>Író (opcionális)</Label>
                <Input
                  placeholder="Keresés..."
                  value={scorerSearchTerm}
                  onChange={(event) => {
                    setScorerSearchTerm(event.target.value)
                    setShowScorerDropdown(event.target.value.length > 0)
                  }}
                  onBlur={() => setTimeout(() => setShowScorerDropdown(false), 150)}
                  onFocus={() => scorerSearchTerm && setShowScorerDropdown(true)}
                />
                {showScorerDropdown && (
                  <Card className="max-h-40 overflow-y-auto bg-card/95">
                    <CardContent className="p-0">
                      <div className="divide-y divide-border/30">
                        {getAvailablePlayersForSelection(scorerSearchTerm, getAllTournamentPlayers()).map((player: any) => {
                          const playerId = player.playerReference?._id || player.playerReference || player._id
                          const playerName = player.playerReference?.name || player.name || "Ismeretlen játékos"
                          return (
                            <button
                              key={playerId}
                              type="button"
                              onClick={() => {
                                setSelectedScorer(playerId)
                                setScorerSearchTerm(playerName)
                                setShowScorerDropdown(false)
                              }}
                              className="w-full px-3 py-2 text-left text-sm hover:bg-muted/20"
                            >
                              {playerName}
                            </button>
                          )
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              <div className="grid gap-3">
                <Label htmlFor="boardSelect">Tábla</Label>
                <select
                  id="boardSelect"
                  value={selectedBoard}
                  onChange={(event) => setSelectedBoard(event.target.value)}
                  className="rounded-lg border border-border/40 bg-card/80 px-3 py-2 text-sm text-foreground shadow-sm shadow-black/15 focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Válassz táblát</option>
                  {availableBoards.map((board: any) => (
                    <option key={board.boardNumber} value={board.boardNumber.toString()}>
                      {formatBoardDisplay(board.boardNumber, board.name)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddMatchModal(false)
                  setSelectedPlayer1("")
                  setSelectedPlayer2("")
                  setSelectedScorer("")
                  setSelectedBoard("")
                  setPlayer1SearchTerm("")
                  setPlayer2SearchTerm("")
                  setScorerSearchTerm("")
                }}
                disabled={addingMatch}
              >
                Mégse
              </Button>
              <Button
                onClick={handleAddMatch}
                disabled={
                  addingMatch ||
                  (!!selectedPlayer1 && !!selectedPlayer2 && selectedPlayer1 === selectedPlayer2) ||
                  ((!!selectedPlayer1 || !!selectedPlayer2) && !selectedBoard)
                }
              >
                {addingMatch ? "Hozzáadás..." : "Hozzáadás"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showMatchEditModal} onOpenChange={setShowMatchEditModal}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Meccs eredmény rögzítése</DialogTitle>
              <DialogDescription>
                Állítsd be a legek számát és statisztikákat. Mentés után a meccs befejezettnek számít.
              </DialogDescription>
            </DialogHeader>

            {selectedMatch && (
              <Card className="bg-muted/10">
                <CardContent className="space-y-6 pt-6">
                  <div className="text-center text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground">{selectedMatch.player1?.name || "TBD"}</span>
                    <span className="mx-2 text-muted-foreground">vs</span>
                    <span className="font-semibold text-foreground">{selectedMatch.player2?.name || "TBD"}</span>
                  </div>

                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-4 rounded-xl bg-card/95 p-4 shadow-sm shadow-black/20">
                      <h4 className="text-sm font-semibold text-primary">{selectedMatch.player1?.name || "Player 1"}</h4>
                      <div className="grid gap-3">
                        <div className="grid gap-2">
                          <Label>Nyert legek</Label>
                          <Input
                            type="number"
                            min={0}
                            max={15}
                            value={editForm.player1LegsWon}
                            onChange={(event) => setEditForm((prev) => ({
                              ...prev,
                              player1LegsWon: Number(event.target.value) || 0,
                            }))}
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label>180-ak száma</Label>
                          <Input
                            type="number"
                            min={0}
                            max={60}
                            value={editForm.player1Stats.oneEightiesCount}
                            onChange={(event) => setEditForm((prev) => ({
                              ...prev,
                              player1Stats: {
                                ...prev.player1Stats,
                                oneEightiesCount: Number(event.target.value) || 0,
                              },
                            }))}
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label>Legmagasabb kiszálló</Label>
                          <Input
                            type="number"
                            min={0}
                            max={170}
                            value={editForm.player1Stats.highestCheckout}
                            onChange={(event) => setEditForm((prev) => ({
                              ...prev,
                              player1Stats: {
                                ...prev.player1Stats,
                                highestCheckout: Number(event.target.value) || 0,
                              },
                            }))}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4 rounded-xl bg-card/95 p-4 shadow-sm shadow-black/20">
                      <h4 className="text-sm font-semibold text-accent">{selectedMatch.player2?.name || "Player 2"}</h4>
                      <div className="grid gap-3">
                        <div className="grid gap-2">
                          <Label>Nyert legek</Label>
                          <Input
                            type="number"
                            min={0}
                            max={15}
                            value={editForm.player2LegsWon}
                            onChange={(event) => setEditForm((prev) => ({
                              ...prev,
                              player2LegsWon: Number(event.target.value) || 0,
                            }))}
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label>180-ak száma</Label>
                          <Input
                            type="number"
                            min={0}
                            max={60}
                            value={editForm.player2Stats.oneEightiesCount}
                            onChange={(event) => setEditForm((prev) => ({
                              ...prev,
                              player2Stats: {
                                ...prev.player2Stats,
                                oneEightiesCount: Number(event.target.value) || 0,
                              },
                            }))}
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label>Legmagasabb kiszálló</Label>
                          <Input
                            type="number"
                            min={0}
                            max={170}
                            value={editForm.player2Stats.highestCheckout}
                            onChange={(event) => setEditForm((prev) => ({
                              ...prev,
                              player2Stats: {
                                ...prev.player2Stats,
                                highestCheckout: Number(event.target.value) || 0,
                              },
                            }))}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={() => setShowMatchEditModal(false)}>
                Mégse
              </Button>
              <Button onClick={handleSaveMatch} disabled={editForm.player1LegsWon === editForm.player2LegsWon}>
                Mentés
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showMatchPlayerEditModal} onOpenChange={setShowMatchPlayerEditModal}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Meccs párosítás szerkesztése</DialogTitle>
              <DialogDescription>Állítsd be a játékosokat, írót és táblát ehhez a meccshez.</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid gap-3">
                <Label>Első játékos</Label>
                <Input
                  placeholder="Keresés..."
                  value={editPairPlayer1Search}
                  onChange={(event) => {
                    setEditPairPlayer1Search(event.target.value)
                    setShowEditPairPlayer1Dropdown(event.target.value.length > 0)
                  }}
                  onBlur={() => setTimeout(() => setShowEditPairPlayer1Dropdown(false), 150)}
                  onFocus={() => editPairPlayer1Search && setShowEditPairPlayer1Dropdown(true)}
                />
                {showEditPairPlayer1Dropdown && (
                  <Card className="max-h-48 overflow-y-auto bg-card/95">
                    <CardContent className="p-0">
                      <div className="divide-y divide-border/30">
                        {getAvailablePlayersForSelection(editPairPlayer1Search, getAvailablePlayersForRound(selectedRound)).map((player: any) => {
                          const playerId = player.playerReference?._id || player.playerReference || player._id
                          const playerName = player.playerReference?.name || player.name || "Ismeretlen játékos"
                          return (
                            <button
                              key={playerId}
                              type="button"
                              onClick={() => {
                                setEditPairPlayer1(playerId)
                                setEditPairPlayer1Search(playerName)
                                setShowEditPairPlayer1Dropdown(false)
                              }}
                              className="w-full px-3 py-2 text-left text-sm hover:bg-muted/20"
                            >
                              {playerName}
                            </button>
                          )
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              <div className="grid gap-3">
                <Label>Második játékos</Label>
                <Input
                  placeholder="Keresés..."
                  value={editPairPlayer2Search}
                  onChange={(event) => {
                    setEditPairPlayer2Search(event.target.value)
                    setShowEditPairPlayer2Dropdown(event.target.value.length > 0)
                  }}
                  onBlur={() => setTimeout(() => setShowEditPairPlayer2Dropdown(false), 150)}
                  onFocus={() => editPairPlayer2Search && setShowEditPairPlayer2Dropdown(true)}
                />
                {showEditPairPlayer2Dropdown && (
                  <Card className="max-h-48 overflow-y-auto bg-card/95">
                    <CardContent className="p-0">
                      <div className="divide-y divide-border/30">
                        {getAvailablePlayersForSelection(editPairPlayer2Search, getAvailablePlayersForRound(selectedRound)).map((player: any) => {
                          const playerId = player.playerReference?._id || player.playerReference || player._id
                          const playerName = player.playerReference?.name || player.name || "Ismeretlen játékos"
                          return (
                            <button
                              key={playerId}
                              type="button"
                              onClick={() => {
                                setEditPairPlayer2(playerId)
                                setEditPairPlayer2Search(playerName)
                                setShowEditPairPlayer2Dropdown(false)
                              }}
                              className="w-full px-3 py-2 text-left text-sm hover:bg-muted/20"
                            >
                              {playerName}
                            </button>
                          )
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              <div className="grid gap-3">
                <Label>Író</Label>
                <Input
                  placeholder="Keresés..."
                  value={editPairScorerSearch}
                  onChange={(event) => {
                    setEditPairScorerSearch(event.target.value)
                    setShowEditPairScorerDropdown(event.target.value.length > 0)
                  }}
                  onBlur={() => setTimeout(() => setShowEditPairScorerDropdown(false), 150)}
                  onFocus={() => editPairScorerSearch && setShowEditPairScorerDropdown(true)}
                />
                {showEditPairScorerDropdown && (
                  <Card className="max-h-40 overflow-y-auto bg-card/95">
                    <CardContent className="p-0">
                      <div className="divide-y divide-border/30">
                        {getAvailablePlayersForSelection(editPairScorerSearch, getAllTournamentPlayers()).map((player: any) => {
                          const playerId = player.playerReference?._id || player.playerReference || player._id
                          const playerName = player.playerReference?.name || player.name || "Ismeretlen játékos"
                          return (
                            <button
                              key={playerId}
                              type="button"
                              onClick={() => {
                                setEditPairScorer(playerId)
                                setEditPairScorerSearch(playerName)
                                setShowEditPairScorerDropdown(false)
                              }}
                              className="w-full px-3 py-2 text-left text-sm hover:bg-muted/20"
                            >
                              {playerName}
                            </button>
                          )
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {!editingMatch?.matchReference && (
                <div className="grid gap-3">
                  <Label>Tábla</Label>
                  <select
                    value={editPairBoard}
                    onChange={(event) => setEditPairBoard(event.target.value)}
                    className="rounded-lg border border-border/40 bg-card/80 px-3 py-2 text-sm text-foreground shadow-sm shadow-black/15 focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Válassz táblát</option>
                    {availableBoards.map((board: any) => (
                      <option key={board.boardNumber} value={board.boardNumber.toString()}>
                        {formatBoardDisplay(board.boardNumber, board.name)}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowMatchPlayerEditModal(false)
                  resetEditPairState()
                }}
                disabled={updatingMatchPlayer}
              >
                Mégse
              </Button>
              <Button onClick={handleUpdateMatchPlayer} disabled={updatingMatchPlayer}>
                {updatingMatchPlayer ? "Mentés..." : "Mentés"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showMatchSettingsModal} onOpenChange={setShowMatchSettingsModal}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Meccs beállítások</DialogTitle>
              <DialogDescription>Állítsd be a játékosokat, írót és táblát ehhez a meccshez.</DialogDescription>
            </DialogHeader>

            {editingMatchSettings && (
              <div className="space-y-4">
                <div className="grid gap-3">
                  <Label>Első játékos</Label>
                  <Input
                    placeholder="Keresés..."
                    value={player1SearchTerm}
                    onChange={(event) => {
                      setPlayer1SearchTerm(event.target.value)
                      setShowPlayer1Dropdown(event.target.value.length > 0)
                    }}
                    onBlur={() => setTimeout(() => setShowPlayer1Dropdown(false), 150)}
                    onFocus={() => player1SearchTerm && setShowPlayer1Dropdown(true)}
                  />
                  {showPlayer1Dropdown && (
                    <Card className="max-h-48 overflow-y-auto bg-card/95">
                      <CardContent className="p-0">
                        <div className="divide-y divide-border/30">
                          {getAvailablePlayersForSelection(player1SearchTerm, getAllTournamentPlayers()).map((player: any) => {
                            const playerId = player.playerReference?._id || player.playerReference || player._id
                            const playerName = player.playerReference?.name || player.name || "Ismeretlen játékos"
                            return (
                              <button
                                key={playerId}
                                type="button"
                                onClick={() => {
                                  setSelectedPlayer1(playerId)
                                  setPlayer1SearchTerm(playerName)
                                  setShowPlayer1Dropdown(false)
                                }}
                                className="w-full px-3 py-2 text-left text-sm hover:bg-muted/20"
                              >
                                {playerName}
                              </button>
                            )
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>

                <div className="grid gap-3">
                  <Label>Második játékos</Label>
                  <Input
                    placeholder="Keresés..."
                    value={player2SearchTerm}
                    onChange={(event) => {
                      setPlayer2SearchTerm(event.target.value)
                      setShowPlayer2Dropdown(event.target.value.length > 0)
                    }}
                    onBlur={() => setTimeout(() => setShowPlayer2Dropdown(false), 150)}
                    onFocus={() => player2SearchTerm && setShowPlayer2Dropdown(true)}
                  />
                  {showPlayer2Dropdown && (
                    <Card className="max-h-48 overflow-y-auto bg-card/95">
                      <CardContent className="p-0">
                        <div className="divide-y divide-border/30">
                          {getAvailablePlayersForSelection(player2SearchTerm, getAllTournamentPlayers()).map((player: any) => {
                            const playerId = player.playerReference?._id || player.playerReference || player._id
                            const playerName = player.playerReference?.name || player.name || "Ismeretlen játékos"
                            return (
                              <button
                                key={playerId}
                                type="button"
                                onClick={() => {
                                  setSelectedPlayer2(playerId)
                                  setPlayer2SearchTerm(playerName)
                                  setShowPlayer2Dropdown(false)
                                }}
                                className="w-full px-3 py-2 text-left text-sm hover:bg-muted/20"
                              >
                                {playerName}
                              </button>
                            )
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>

                <div className="grid gap-3">
                  <Label>Író</Label>
                  <Input
                    placeholder="Keresés..."
                    value={scorerSearchTerm}
                    onChange={(event) => {
                      setScorerSearchTerm(event.target.value)
                      setShowScorerDropdown(event.target.value.length > 0)
                    }}
                    onBlur={() => setTimeout(() => setShowScorerDropdown(false), 150)}
                    onFocus={() => scorerSearchTerm && setShowScorerDropdown(true)}
                  />
                  {showScorerDropdown && (
                    <Card className="max-h-40 overflow-y-auto bg-card/95">
                      <CardContent className="p-0">
                        <div className="divide-y divide-border/30">
                          {getAvailablePlayersForSelection(scorerSearchTerm, getAllTournamentPlayers()).map((player: any) => {
                            const playerId = player.playerReference?._id || player.playerReference || player._id
                            const playerName = player.playerReference?.name || player.name || "Ismeretlen játékos"
                            return (
                              <button
                                key={playerId}
                                type="button"
                                onClick={() => {
                                  setSelectedScorer(playerId)
                                  setScorerSearchTerm(playerName)
                                  setShowScorerDropdown(false)
                                }}
                                className="w-full px-3 py-2 text-left text-sm hover:bg-muted/20"
                              >
                                {playerName}
                              </button>
                            )
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>

                <div className="grid gap-3">
                  <Label>Tábla</Label>
                  <select
                    value={selectedBoard}
                    onChange={(event) => setSelectedBoard(event.target.value)}
                    className="rounded-lg border border-border/40 bg-card/80 px-3 py-2 text-sm text-foreground shadow-sm shadow-black/15 focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Válassz táblát</option>
                    {availableBoards.map((board: any) => (
                      <option key={board.boardNumber} value={board.boardNumber.toString()}>
                        {formatBoardDisplay(board.boardNumber, board.name)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowMatchSettingsModal(false)
                  setEditingMatchSettings(null)
                  setSelectedPlayer1("")
                  setSelectedPlayer2("")
                  setSelectedScorer("")
                  setSelectedBoard("")
                  setPlayer1SearchTerm("")
                  setPlayer2SearchTerm("")
                  setScorerSearchTerm("")
                }}
                disabled={editSettingsLoading}
              >
                Mégse
              </Button>
              <Button onClick={handleSaveMatchSettings} disabled={editSettingsLoading}>
                {editSettingsLoading ? "Mentés..." : "Mentés"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showDeleteMatchModal} onOpenChange={setShowDeleteMatchModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Meccs törlése</DialogTitle>
              <DialogDescription>Biztosan törölni szeretnéd ezt a meccset? A művelet nem visszavonható.</DialogDescription>
            </DialogHeader>
            {matchToDelete?.match && (
              <Alert className="bg-destructive/10 text-destructive">
                <AlertTitle>{matchToDelete.match.player1?.name} vs {matchToDelete.match.player2?.name || "Üres"}</AlertTitle>
                <AlertDescription>{matchToDelete.round}. kör</AlertDescription>
              </Alert>
            )}
            <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={() => setShowDeleteMatchModal(false)} disabled={deletingMatch}>
                Mégse
              </Button>
              <Button variant="destructive" onClick={handleDeleteMatch} disabled={deletingMatch}>
                {deletingMatch ? "Törlés..." : "Törlés"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showDeleteLastRoundModal} onOpenChange={setShowDeleteLastRoundModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Utolsó kör visszavonása</DialogTitle>
              <DialogDescription>Az összes meccs törlődik az utolsó generált körből. Biztosan folytatod?</DialogDescription>
            </DialogHeader>
            <Alert className="bg-destructive/10 text-destructive">
              <AlertTitle>Figyelem!</AlertTitle>
              <AlertDescription>Ez a művelet nem visszavonható.</AlertDescription>
            </Alert>
            <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={() => setShowDeleteLastRoundModal(false)} disabled={deletingLastRound}>
                Mégse
              </Button>
              <Button variant="destructive" onClick={handleDeleteLastRound} disabled={deletingLastRound}>
                {deletingLastRound ? "Törlés..." : "Törlés"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <LegsViewModal
          isOpen={showLegsModal}
          onClose={() => {
            setShowLegsModal(false)
            setSelectedMatchForLegs(null)
          }}
          match={
            selectedMatchForLegs && selectedMatchForLegs.matchReference
              ? {
                  _id: selectedMatchForLegs.matchReference._id,
                  player1: {
                    playerId: {
                      _id: selectedMatchForLegs.player1?._id || "",
                      name: selectedMatchForLegs.player1?.name || "TBD",
                    },
                  },
                  player2: {
                    playerId: {
                      _id: selectedMatchForLegs.player2?._id || "",
                      name: selectedMatchForLegs.player2?.name || "TBD",
                    },
                  },
                  clubId,
                }
              : null
          }
        />
      </div>
    </TooltipProvider>
  )
}

const TournamentKnockoutBracket: React.FC<TournamentKnockoutBracketProps> = (props) => {
  return (
    <KnockoutErrorBoundary 
      tournamentCode={props.tournamentCode} 
      userClubRole={props.userClubRole}
    >
      <TournamentKnockoutBracketContent {...props} />
    </KnockoutErrorBoundary>
  )
}

export default TournamentKnockoutBracket