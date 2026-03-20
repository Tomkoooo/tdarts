'use client'

import React, { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import { useTranslations } from "next-intl";
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

import { Button } from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/Input";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/Label";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { coerceNumericValue } from "@/lib/number-input";
import { showErrorToast } from "@/lib/toastUtils";
import { useUserContext } from "@/hooks/useUser";
import {
  addManualKnockoutMatchAction,
  deleteKnockoutMatchAction,
  deleteLastKnockoutRoundAction,
  finishKnockoutMatchAction,
  generateEmptyKnockoutRoundsAction,
  generateNextKnockoutRoundAction,
  generateRandomPairingsAction,
  getKnockoutViewDataAction,
  updateEmptyKnockoutPairAction,
  updateKnockoutMatchSettingsAction,
} from "@/features/tournaments/actions/knockoutManagement.action";

import LegsViewModal from "./LegsViewModal";
import KnockoutBracketDiagram, { DiagramMatch, DiagramRound, RoundSummary } from "./KnockoutBracketDiagram";

class KnockoutErrorBoundary extends React.Component<
  { children: React.ReactNode; tournamentCode: string; userClubRole: string; t: any },
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
    const { t } = this.props;
    if (this.state.hasError) {
      return (
        <Card className="bg-destructive/10 text-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <IconAlertTriangle className="h-5 w-5" />
              {t("hiba_tortent_a_knockout_3hh4")}</CardTitle>
            <CardDescription className="text-destructive/80">
              {this.state.error?.message || "Ismeretlen hiba"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-destructive/80">
            <p>{t("probald_meg_ujratolteni_az_j5oz")}</p>
          </CardContent>
        </Card>
      )
    }

    return this.props.children
  }
}

interface TournamentKnockoutBracketProps {
  tournamentCode: string
  tournament?: any
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
      average?: number
      highestCheckout?: number
      oneEightiesCount?: number
    }
    player2: {
      legsWon: number
      average?: number
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
  tournament,
  userClubRole,
  tournamentPlayers = [],
  knockoutMethod,
  clubId,
}) => {
  const { user } = useUserContext()
  const t = useTranslations("Tournament.components");
  const tTour = useTranslations("Tournament");
  const isAdmin = userClubRole === "admin" || userClubRole === "moderator"
  const fullscreenContainerRef = useRef<HTMLDivElement>(null)
  const [knockoutData, setKnockoutData] = useState<KnockoutRound[]>([])
  const [loading, setLoading] = useState(true)
  const [showGenerateNextRound, setShowGenerateNextRound] = useState(false)
  const [showMatchEditModal, setShowMatchEditModal] = useState(false)
  const [selectedMatch, setSelectedMatch] = useState<KnockoutMatch | null>(null)
  const [showAddMatchModal, setShowAddMatchModal] = useState(false)
  const [selectedRound, setSelectedRound] = useState<number>(1)
  const [selectedPlayer1, setSelectedPlayer1] = useState<string>("")
  const [selectedPlayer2, setSelectedPlayer2] = useState<string>("")
  const [selectedScorer, setSelectedScorer] = useState<string>("")
  const [selectedBoard, setSelectedBoard] = useState<string>("")
  const [editForm, setEditForm] = useState({
    player1LegsWon: 0,
    player2LegsWon: 0,
    player1Stats: { average: 0, highestCheckout: 0, oneEightiesCount: 0, totalThrows: 0, totalScore: 0 },
    player2Stats: { average: 0, highestCheckout: 0, oneEightiesCount: 0, totalThrows: 0, totalScore: 0 },
  })
  const [availablePlayers, setAvailablePlayers] = useState<any[]>([])
  const [availableBoards, setAvailableBoards] = useState<any[]>([])
  const [currentKnockoutMethod, setCurrentKnockoutMethod] = useState<"automatic" | "manual" | undefined>(knockoutMethod)
  const [showGenerateEmptyRoundsModal, setShowGenerateEmptyRoundsModal] = useState(false)
  const [roundsToGenerate, setRoundsToGenerate] = useState(2)
  const [showRandomPairingModal, setShowRandomPairingModal] = useState(false)
  const [selectedPlayersForPairing, setSelectedPlayersForPairing] = useState<string[]>([])
  const [playerSearchTerm, setPlayerSearchTerm] = useState("")
  const [player1SearchTerm, setPlayer1SearchTerm] = useState("")
  const [player2SearchTerm, setPlayer2SearchTerm] = useState("")
  const [scorerSearchTerm, setScorerSearchTerm] = useState("")
  const [showPlayer1Dropdown, setShowPlayer1Dropdown] = useState(false)
  const [showPlayer2Dropdown, setShowPlayer2Dropdown] = useState(false)
  const [showScorerDropdown, setShowScorerDropdown] = useState(false)
  const [showMatchPlayerEditModal, setShowMatchPlayerEditModal] = useState(false)
  const [editingMatch, setEditingMatch] = useState<KnockoutMatch | null>(null)
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
  const [zoomLevel, setZoomLevel] = useState(1)
  const [showDeleteMatchModal, setShowDeleteMatchModal] = useState(false)
  const [matchToDelete, setMatchToDelete] = useState<{ match: KnockoutMatch; round: number; index: number } | null>(null)
  const [showDeleteLastRoundModal, setShowDeleteLastRoundModal] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showActionsInFullscreen, setShowActionsInFullscreen] = useState(true)
  const [tournamentStatus, setTournamentStatus] = useState<string | null>(null)

  const applyKnockoutViewData = (response: any) => {
    if (!response || typeof response !== "object" || !("success" in response) || !response.success) {
      return false
    }

    const knockoutRounds = (response as { knockout?: any[] }).knockout || []
    knockoutRounds.forEach((round: any) => {
      if (!round.matches) {
        round.matches = []
      }
    })
    setKnockoutData(knockoutRounds)
    setAvailableBoards((response as { availableBoards?: any[] }).availableBoards || [])
    setTournamentStatus((response as { tournamentStatus?: string | null }).tournamentStatus || null)
    setCurrentKnockoutMethod((response as { knockoutMethod?: "automatic" | "manual" }).knockoutMethod || "automatic")

    const responsePlayers = (response as { tournamentPlayers?: any[] }).tournamentPlayers || []
    if (Array.isArray(responsePlayers) && responsePlayers.length > 0) {
      setAvailablePlayers(responsePlayers)
    } else if (Array.isArray(tournamentPlayers) && tournamentPlayers.length > 0) {
      setAvailablePlayers(tournamentPlayers)
    } else {
      setAvailablePlayers([])
    }
    return true
  }

  useEffect(() => {
    if (Array.isArray(tournament?.knockout) && tournament.knockout.length > 0) {
      setKnockoutData(tournament.knockout)
      setAvailableBoards(Array.isArray(tournament?.boards) ? tournament.boards : [])
      setTournamentStatus(tournament?.tournamentSettings?.status || null)
      setCurrentKnockoutMethod(
        (tournament?.tournamentSettings?.knockoutMethod as "automatic" | "manual" | undefined) || knockoutMethod
      )
      return
    }
    void fetchKnockoutData()
  }, [tournamentCode, tournament?.knockout, tournament?.boards, tournament?.tournamentSettings?.status, tournament?.tournamentSettings?.knockoutMethod, knockoutMethod])

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

  const fetchKnockoutData = async () => {
    setLoading(true)
    try {
      const response = await getKnockoutViewDataAction({ tournamentCode })
      if (!applyKnockoutViewData(response)) {
        showErrorToast("Nem sikerült betölteni a knockout adatokat.", {
          context: "Knockout adatok betöltése",
          errorName: "Betöltés sikertelen",
        })
      }
    } catch (err: any) {
      console.error("Error fetching knockout data", err)
      showErrorToast(err.response?.data?.error || "Nem sikerült betölteni a knockout adatokat.", {
        error: err?.response?.data?.error,
        context: "Knockout adatok betöltése",
        errorName: "Betöltés sikertelen",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateNextRound = async () => {
    if (knockoutData.length === 0) return
    const rounds = knockoutData.filter((round) => round.matches && round.matches.length > 0)
    if (rounds.length === 0) return

    const currentRound = rounds[rounds.length - 1].round
    setLoading(true)

    try {
      const response = await generateNextKnockoutRoundAction({ tournamentCode, currentRound })
      if (response && typeof response === 'object' && 'success' in response && response.success) {
        await fetchKnockoutData()
        setShowGenerateNextRound(false)
        toast.success(tTour('knockout.success_next_round'))
      } else {
        showErrorToast("Nem sikerült generálni a következő kört.", {
          error: 'generateNextKnockoutRoundAction returned unsuccessful result',
          context: "Következő kör generálása",
          errorName: "Generálás sikertelen",
        })
      }
    } catch (err: any) {
      showErrorToast(err.response?.data?.error || "Nem sikerült generálni a következő kört.", {
        error: err?.response?.data?.error,
        context: "Következő kör generálása",
        errorName: "Generálás sikertelen",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleMatchEdit = (match: KnockoutMatch) => {
    if (!match.matchReference || !match.player1 || !match.player2) {
      showErrorToast(tTour('knockout.error_bye_edit'), {
        context: "Meccs szerkesztése",
        errorName: "Szerkesztés sikertelen",
      })
      return
    }

    setSelectedMatch(match)
    setEditForm({
      player1LegsWon: match.matchReference?.player1?.legsWon || 0,
      player2LegsWon: match.matchReference?.player2?.legsWon || 0,
      player1Stats: {
        average: match.matchReference?.player1?.average || 0,
        highestCheckout: match.matchReference?.player1?.highestCheckout || 0,
        oneEightiesCount: match.matchReference?.player1?.oneEightiesCount || 0,
        totalThrows: 0,
        totalScore: 0,
      },
      player2Stats: {
        average: match.matchReference?.player2?.average || 0,
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
      showErrorToast(t("nem_lehet_menteni_a_u9c9"), {
        context: "Meccs mentése",
        errorName: "Mentés sikertelen",
      })
      return
    }

    setLoading(true)
    try {
      const cleanedForm = {
        player1LegsWon: coerceNumericValue(editForm.player1LegsWon),
        player2LegsWon: coerceNumericValue(editForm.player2LegsWon),
        player1Stats: {
          ...editForm.player1Stats,
          average: coerceNumericValue(editForm.player1Stats.average),
          oneEightiesCount: coerceNumericValue(editForm.player1Stats.oneEightiesCount),
          highestCheckout: coerceNumericValue(editForm.player1Stats.highestCheckout),
        },
        player2Stats: {
          ...editForm.player2Stats,
          average: coerceNumericValue(editForm.player2Stats.average),
          oneEightiesCount: coerceNumericValue(editForm.player2Stats.oneEightiesCount),
          highestCheckout: coerceNumericValue(editForm.player2Stats.highestCheckout),
        },
        allowManualFinish: true, // Allow finishing without legs (admin manual entry)
        isManual: true,
        adminId: user?._id,
      };

      const matchId =
        typeof selectedMatch.matchReference === "object"
          ? selectedMatch.matchReference._id
          : selectedMatch.matchReference
      const response = await finishKnockoutMatchAction({
        matchId,
        player1LegsWon: Number(cleanedForm.player1LegsWon),
        player2LegsWon: Number(cleanedForm.player2LegsWon),
        player1Stats: cleanedForm.player1Stats,
        player2Stats: cleanedForm.player2Stats,
      })
      if (response && typeof response === 'object' && 'success' in response && response.success) {
        await fetchKnockoutData()
        setShowMatchEditModal(false)
        setSelectedMatch(null)
        toast.success(tTour('knockout.success_match_updated'))
      } else {
        showErrorToast("Nem sikerült frissíteni a meccset.", {
          error: 'finishKnockoutMatchAction returned unsuccessful result',
          context: "Meccs frissítése",
          errorName: "Frissítés sikertelen",
        })
      }
    } catch (err: any) {
      showErrorToast(err.response?.data?.error || "Nem sikerült frissíteni a meccset.", {
        error: err?.response?.data?.error,
        context: "Meccs frissítése",
        errorName: "Frissítés sikertelen",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAddMatch = async () => {
    if (!selectedPlayer1 || !selectedPlayer2) {
      toast.error(tTour('knockout.error_select_player'))
      return
    }
    if (selectedPlayer1 && selectedPlayer2 && selectedPlayer1 === selectedPlayer2) {
      toast.error(tTour('knockout.error_different_players'))
      return
    }

    if ((selectedPlayer1 || selectedPlayer2) && !selectedBoard) {
      toast.error(tTour('knockout.error_select_board'))
      return
    }

    setLoading(true)

    try {
      const response = await addManualKnockoutMatchAction({
        tournamentCode,
        round: selectedRound,
        player1Id: selectedPlayer1,
        player2Id: selectedPlayer2,
        scorerId: selectedScorer || undefined,
        boardNumber: selectedBoard ? parseInt(selectedBoard) : undefined,
      })

      if (response && typeof response === 'object' && 'success' in response && response.success) {
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
        toast.success(tTour('knockout.success_match_added'))
      } else {
        showErrorToast("Nem sikerült hozzáadni a meccset.", {
          error: 'addManualKnockoutMatchAction returned unsuccessful result',
          context: "Meccs hozzáadása",
          errorName: "Hozzáadás sikertelen",
        })
      }
    } catch (err: any) {
      showErrorToast(err.response?.data?.error || "Nem sikerült hozzáadni a meccset.", {
        error: err?.response?.data?.error,
        context: "Meccs hozzáadása",
        errorName: "Hozzáadás sikertelen",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateEmptyRounds = async () => {
    setLoading(true)
    try {
      const response = await generateEmptyKnockoutRoundsAction({
        tournamentCode,
        roundsCount: roundsToGenerate,
      })
      if (response && typeof response === 'object' && 'success' in response && response.success) {
        await fetchKnockoutData()
        setShowGenerateEmptyRoundsModal(false)
        toast.success(tTour('knockout.success_empty_rounds'))
      } else {
        showErrorToast("Nem sikerült generálni az üres köröket.", {
          error: 'generateEmptyKnockoutRoundsAction returned unsuccessful result',
          context: "Üres körök generálása",
          errorName: "Generálás sikertelen",
        })
      }
    } catch (err: any) {
      showErrorToast(err.response?.data?.error || "Nem sikerült generálni az üres köröket.", {
        error: err?.response?.data?.error,
        context: "Üres körök generálása",
        errorName: "Generálás sikertelen",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateRandomPairings = async () => {
    if (selectedPlayersForPairing.length < 2) {
      toast.error(tTour('knockout.error_min_players'))
      return
    }

    setLoading(true)

    try {
      const response = await generateRandomPairingsAction({
        tournamentCode,
        round: selectedRound,
        selectedPlayerIds: selectedPlayersForPairing,
      })
      if (response && typeof response === 'object' && 'success' in response && response.success) {
        await fetchKnockoutData()
        setShowRandomPairingModal(false)
        setSelectedPlayersForPairing([])
        toast.success(tTour('knockout.success_pairings'))
      } else {
        showErrorToast("Nem sikerült generálni a párosításokat.", {
          error: 'generateRandomPairingsAction returned unsuccessful result',
          context: "Párosítások generálása",
          errorName: "Generálás sikertelen",
        })
      }
    } catch (err: any) {
      showErrorToast(err.response?.data?.error || "Nem sikerült generálni a párosításokat.", {
        error: err?.response?.data?.error,
        context: "Párosítások generálása",
        errorName: "Generálás sikertelen",
      })
    } finally {
      setLoading(false)
    }
  }

  const handlePlayerSelectionForPairing = (playerId: string) => {
    setSelectedPlayersForPairing((prev) =>
      prev.includes(playerId) ? prev.filter((id) => id !== playerId) : [...prev, playerId]
    )
  }

  const handleSaveMatchSettings = async () => {
    if (!editingMatchSettings || !editingMatchSettings.matchReference) return

    setLoading(true)

    try {
      const matchId =
        typeof editingMatchSettings.matchReference === "object"
          ? editingMatchSettings.matchReference._id
          : editingMatchSettings.matchReference

      const response = await updateKnockoutMatchSettingsAction({
        matchId,
        player1Id: selectedPlayer1 || null,
        player2Id: selectedPlayer2 || null,
        scorerId: selectedScorer || undefined,
        boardNumber: selectedBoard ? parseInt(selectedBoard) : undefined,
      })

      if (response && typeof response === 'object' && 'success' in response && response.success) {
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
        toast.success(tTour('knockout.success_settings_updated'))
      } else {
        showErrorToast("Nem sikerült frissíteni a meccs beállításait.", {
          error: 'updateKnockoutMatchSettingsAction returned unsuccessful result',
          context: "Meccs beállítások frissítése",
          errorName: "Frissítés sikertelen",
        })
      }
    } catch (err: any) {
      showErrorToast(err.response?.data?.error || "Nem sikerült frissíteni a meccs beállításait.", {
        error: err?.response?.data?.error,
        context: "Meccs beállítások frissítése",
        errorName: "Frissítés sikertelen",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateMatchPlayer = async () => {
    if (!editingMatch) {
      showErrorToast(t("nem_lehet_frissiteni_a_p1ye"), {
        context: "Knockout meccs frissítés",
        errorName: "Meccs frissítése sikertelen",
      })
      return
    }

    const isNewMatch = !editingMatch.matchReference
    if (isNewMatch && !editPairPlayer1 && !editPairPlayer2) {
      toast.error(tTour('knockout.error_select_player'))
      return
    }

    if (isNewMatch && (editPairPlayer1 || editPairPlayer2) && !editPairBoard) {
      toast.error(tTour('knockout.error_select_board'))
      return
    }

    setLoading(true)
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

        const response = await updateEmptyKnockoutPairAction({
          tournamentCode,
          round: matchRound,
          pairIndex,
          player1Id: editPairPlayer1 || undefined,
          player2Id: editPairPlayer2 || undefined,
          scorerId: editPairScorer || undefined,
          boardNumber: editPairBoard ? parseInt(editPairBoard) : undefined,
        })

        if (response && typeof response === 'object' && 'success' in response && response.success) {
          await fetchKnockoutData()
          toast.success(tTour('knockout.success_match_created'))
          setShowMatchPlayerEditModal(false)
          resetEditPairState()
        } else {
          showErrorToast("Nem sikerült létrehozni a meccset.", {
            error: 'updateEmptyKnockoutPairAction returned unsuccessful result',
            context: "Knockout meccs létrehozása",
            errorName: "Meccs létrehozása sikertelen",
          })
        }
      } else {
        const matchId =
          typeof editingMatch.matchReference === "object"
            ? editingMatch.matchReference._id
            : editingMatch.matchReference

        const response = await updateKnockoutMatchSettingsAction({
          matchId,
          player1Id: editPairPlayer1 || null,
          player2Id: editPairPlayer2 || null,
          scorerId: editPairScorer || undefined,
          boardNumber: editPairBoard ? parseInt(editPairBoard) : undefined,
        })

        if (response && typeof response === 'object' && 'success' in response && response.success) {
          await fetchKnockoutData()
          toast.success(tTour('knockout.success_match_updated'))
          setShowMatchPlayerEditModal(false)
          resetEditPairState()
        } else {
          showErrorToast("Nem sikerült frissíteni a meccset.", {
            error: 'updateKnockoutMatchSettingsAction returned unsuccessful result',
            context: "Knockout meccs frissítése",
            errorName: "Meccs frissítése sikertelen",
          })
        }
      }
    } catch (err: any) {
      showErrorToast(err.response?.data?.error || "Nem sikerült frissíteni a meccset.", {
        error: err?.response?.data?.error,
        context: "Knockout meccs frissítése",
        errorName: "Meccs frissítése sikertelen",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleViewLegs = (match: KnockoutMatch) => {
    if (!match.matchReference) {
      toast.error(tTour('knockout.error_bye_legs'))
      return
    }
    setSelectedMatchForLegs(match)
    setShowLegsModal(true)
  }

  const handleDeleteMatch = async () => {
    if (!matchToDelete) return
    setLoading(true)
    try {
      const response = await deleteKnockoutMatchAction({
        tournamentCode,
        round: matchToDelete.round,
        pairIndex: matchToDelete.index,
      })
      if (response && typeof response === 'object' && 'success' in response && response.success) {
        await fetchKnockoutData()
        toast.success(tTour('knockout.success_match_deleted'))
        setShowDeleteMatchModal(false)
        setMatchToDelete(null)
      } else {
        showErrorToast("Nem sikerült törölni a meccset.", {
          error: 'deleteKnockoutMatchAction returned unsuccessful result',
          context: "Knockout meccs törlése",
          errorName: "Meccs törlése sikertelen",
        })
      }
    } catch (err: any) {
      showErrorToast(err.response?.data?.error || "Nem sikerült törölni a meccset.", {
        error: err?.response?.data?.error,
        context: "Knockout meccs törlése",
        errorName: "Meccs törlése sikertelen",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteLastRound = async () => {
    setLoading(true)
    try {
      const response = await deleteLastKnockoutRoundAction({ tournamentCode })
      if (response && typeof response === 'object' && 'success' in response && response.success) {
        await fetchKnockoutData()
        toast.success(tTour('knockout.success_round_deleted'))
        setShowDeleteLastRoundModal(false)
      } else {
        showErrorToast("Nem sikerült törölni az utolsó kört.", {
          error: 'deleteLastKnockoutRoundAction returned unsuccessful result',
          context: "Knockout kör törlése",
          errorName: "Utolsó kör törlése sikertelen",
        })
      }
    } catch (err: any) {
      showErrorToast(err.response?.data?.error || "Nem sikerült törölni az utolsó kört.", {
        error: err?.response?.data?.error,
        context: "Knockout kör törlése",
        errorName: "Utolsó kör törlése sikertelen",
      })
    } finally {
      setLoading(false)
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

  const isTournamentLocked = tournamentStatus === "finished" || tournamentStatus === "archived" || tournamentStatus === "cancelled"
  const roundSummaries: RoundSummary[] = useMemo(() => {
    if (!roundsWithMatches || roundsWithMatches.length === 0) {
      return []
    }
    return roundsWithMatches.map((round, index) => ({
      label: getRoundTitle(index, round.matches?.length || 0, roundsWithMatches.length),
      roundNumber: round.round,
      canAdd: isAdmin && currentKnockoutMethod === "manual" && !isTournamentLocked,
    }))
  }, [roundsWithMatches, currentKnockoutMethod, isAdmin, isTournamentLocked])

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
            {t("betoltes_69f8")}</div>
        </CardContent>
      </Card>
    )
  }


  if (!knockoutData || knockoutData.length === 0) {
    return (
      <Card className="bg-card/92 shadow-lg shadow-black/35">
        <CardContent className="py-12 text-center text-muted-foreground">
          {t("meg_nincs_knockout_tabla_czkk")}</CardContent>
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
    const isPendingOrFinished = tournamentStatus === "pending" || tournamentStatus === "finished"
    
    const allowSettings = !isTournamentLocked && (!finishedMatch || !hasPlayers) && !isPendingOrFinished
    const allowResultEdit = !isTournamentLocked && hasPlayers && !isPendingOrFinished
    const allowDelete = allowSettings && currentKnockoutMethod === "manual" && !isPendingOrFinished

    return (
      <div className="flex flex-wrap gap-1.5 items-center">
        {status !== "pending" && hasPlayers ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="btn btn-ghost btn-md"
                onClick={() => handleViewLegs(rawMatch)}
                aria-label="Legek megtekintése"
              >
                <IconChartHistogram size={16} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">{t("legek_17n1")}</TooltipContent>
          </Tooltip>
        ) : null}

        {isAdmin ? (
          <>
            {allowSettings && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="btn btn-ghost btn-md"
                    onClick={() => openMatchPlayerEditor(rawMatch, rawRound)}
                    aria-label="Meccs beállítások"
                  >
                    <IconSettings size={16} />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top">{t("beallitasok_cd9f")}</TooltipContent>
              </Tooltip>
            )}

            {rawMatch.matchReference && allowResultEdit ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="btn btn-ghost btn-md"
                    onClick={() => handleMatchEdit(rawMatch)}
                    aria-label="Eredmény módosítása"
                  >
                    <IconClipboardList size={16} />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top">{t("eredmeny_modositasa_vhbi")}</TooltipContent>
              </Tooltip>
            ) : null}

            {allowDelete ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="btn btn-ghost btn-md"
                    onClick={() => {
                      setMatchToDelete({ match: rawMatch, round: rawRound.round, index: diagramMatch.meta?.matchIndex ?? 0 })
                      setShowDeleteMatchModal(true)
                    }}
                    aria-label="Meccs törlése"
                  >
                    <IconTrash size={16} />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top">{t("meccs_torlese_3k04")}</TooltipContent>
              </Tooltip>
            ) : null}
          </>
        ) : null}
        {status !=="finished" && (
        <span className="text-xs text-muted-foreground italic flex ml-auto">
          {t("iro_3pep")}{rawMatch.matchReference?.scorer?.name || "Előző vesztes"}
        </span>
        )}
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
              <div className="space-y-2 flex-1">
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <IconHierarchy className="h-6 w-6 text-primary" />
                  {t("egyenes_kieses_lfsy")}{isAdmin && roundsWithMatches.length > 0 && !isTournamentLocked && tournamentStatus !== 'finished' && (
                    <Button
                      className="gap-2 ml-4"
                      size="sm"
                      onClick={() => setShowGenerateNextRound(true)}
                      disabled={loading || roundsWithMatches.some((round) => round.matches?.some((match) => match.matchReference?.status !== "finished"))}
                    >
                      <IconChevronRight className="h-4 w-4" />
                      {t("kovetkezo_kor_generalasa_583b")}</Button>
                  )}
                </CardTitle>
                <CardDescription>
                  {t("kovesd_a_kieseses_ag_6tx7")}</CardDescription>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-sm">
                <div className="flex items-center gap-2 rounded-full bg-muted/20 px-3 py-1 font-mono text-xs text-muted-foreground">
                
                  <Button
                    variant="outline"
                    size="icon"
                    
                    onClick={() => setZoomLevel(1)}
                    title={t("alaphelyzet_mvmx")}
                  >
                    <IconRefresh size={16} className="text-foreground" />
                  </Button>
                  <Separator orientation="vertical" className="h-6 bg-border/60" />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setZoomLevel((prev) => Math.max(0.6, +(prev - 0.1).toFixed(2)))}
                    title={t("kicsinyites_jovs")}
                  >
                    <IconMinus size={16} className="text-foreground" />
                  </Button>
                  <span className="w-12 text-center text-foreground">{Math.round(zoomLevel * 100)}%</span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setZoomLevel((prev) => Math.min(1.6, +(prev + 0.1).toFixed(2)))}
                    title={t("nagyitas_t1rp")}
                  >
                    <IconPlus className="text-foreground" />
                  </Button>
                  
                </div>

                {isFullscreen && (
                  <div className="flex items-center gap-2 rounded-full bg-muted/20 px-3 py-1">
                    <span className="text-xs text-muted-foreground">{t("gombok_ux7w")}</span>
                    <button
                      type="button"
                      onClick={() => setShowActionsInFullscreen(!showActionsInFullscreen)}
                      className={cn(
                        "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
                        showActionsInFullscreen ? "bg-primary" : "bg-muted"
                      )}
                    >
                      <span
                        className={cn(
                          "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                          showActionsInFullscreen ? "translate-x-5" : "translate-x-1"
                        )}
                      />
                    </button>
                  </div>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={toggleFullscreen}
                >
                  {isFullscreen ? (
                    <>
                      <IconPlayerPause className="h-4 w-4" />
                      {t("kilepes_teljes_kepernyobol_6puy")}</>
                  ) : (
                    <>
                      <IconPlayerPlay className="h-4 w-4" />
                      {t("teljes_kepernyo_hkpx")}</>
                  )}
                </Button>

                <Button variant="outline" size="sm" className="gap-2" onClick={fetchKnockoutData}>
                  <IconRefresh className="h-4 w-4" />
                  {t("frissites_knax")}</Button>
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
                        disabled={loading}
                      >
                        <IconPlus className="h-4 w-4" />
                        {t("ures_kor_generalasa_sk12")}</Button>
                      {!knockoutHasStarted && (
                        <Button
                          variant="outline"
                          className="gap-2"
                          onClick={() => {
                            setSelectedRound(roundsWithMatches[0]?.round || 1)
                            setShowRandomPairingModal(true)
                          }}
                          disabled={loading}
                        >
                          <IconHierarchy className="h-4 w-4" />
                          {t("random_parositas_jtvj")}</Button>
                      )}
                    </>
                  )}
                  {currentKnockoutMethod === "manual" && roundsWithMatches.length > 0 && !isTournamentLocked && (
                    <Button
                      variant="destructive"
                      className="gap-2"
                      onClick={() => setShowDeleteLastRoundModal(true)}
                    >
                      <IconTrash className="h-4 w-4" />
                      {t("utolso_kor_visszavonasa_cck2")}</Button>
                  )}
                </div>
              </div>
            )}
          </div>

          <ScrollArea className={cn("relative w-full border rounded-xl bg-card/40", isFullscreen ? "flex-1" : "")}>
            <div className={cn("relative min-w-max pt-20 pb-6", isFullscreen ? "pl-12 pr-6" : "px-6")}>
              <div
                className="origin-top-left"
                style={{ transform: `scale(${zoomLevel})`, transformOrigin: "top left" }}
              >
                <KnockoutBracketDiagram
                  rounds={bracketRounds}
                  renderMatchActions={showActionsInFullscreen ? renderDiagramMatchActions : undefined}
                  roundSummaries={roundSummaries}
                  onAddMatchToRound={currentKnockoutMethod === "manual" ? handleAddMatchForRound : undefined}
                  compactMode={isFullscreen && !showActionsInFullscreen}
                />
              </div>
            </div>
            <ScrollBar orientation="horizontal" />
            <ScrollBar orientation="vertical" />
          </ScrollArea>
        </div>

        {/* Dialogs */}
        <Dialog open={showGenerateNextRound} onOpenChange={setShowGenerateNextRound}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{t("kovetkezo_kor_generalasa_583b")}</DialogTitle>
              <DialogDescription>
                {t("biztosan_generalni_szeretned_a_9x5k")}</DialogDescription>
            </DialogHeader>
            {currentKnockoutMethod === "manual" && (
              <Alert className="bg-primary/10 text-primary">
                <AlertTitle>{t("megjegyzes_manualis_modhoz_uwpe")}</AlertTitle>
                <AlertDescription>
                  {t("bye_meccsek_eseten_az_uov1")}</AlertDescription>
              </Alert>
            )}
            <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">

              <Button onClick={handleGenerateNextRound} disabled={loading}>
                {loading ? "Generálás..." : "Generálás"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showGenerateEmptyRoundsModal} onOpenChange={setShowGenerateEmptyRoundsModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{t("ures_korok_generalasa_bwnc")}</DialogTitle>
              <DialogDescription>{t("adj_meg_hany_ures_2wq7")}</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <Label htmlFor="roundsToGenerate">{t("korok_szama_v4hy")}</Label>
              <Input
                id="roundsToGenerate"
                type="number"
                min={0}
                max={10}
                value={roundsToGenerate ?? ''}
                onNumberChange={(value) => setRoundsToGenerate(coerceNumericValue(value))}
              />
            </div>
            <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">

              <Button onClick={handleGenerateEmptyRounds} disabled={loading}>
                {loading ? "Generálás..." : "Generálás"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showRandomPairingModal} onOpenChange={setShowRandomPairingModal}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{t("random_parositas_jtvj")}</DialogTitle>
              <DialogDescription>
                {t("valaszd_ki_a_jatekosokat_mrxd")}{selectedRound}{t("korben_minimum_ket_jatekos_fxsm")}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="playerSearch">{t("jatekos_keresese_jfey")}</Label>
                <Input
                  id="playerSearch"
                  value={playerSearchTerm}
                  onChange={(event) => setPlayerSearchTerm(event.target.value)}
                  placeholder={t("jatekos_neve_iedl")}
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
                <ScrollBar />
              </ScrollArea>
            </div>
            <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button onClick={handleGenerateRandomPairings} disabled={loading || selectedPlayersForPairing.length < 2}>
                {loading ? "Párosítás..." : `Párosítás (${selectedPlayersForPairing.length})`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showAddMatchModal} onOpenChange={setShowAddMatchModal}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{t("meccs_hozzaadasa_k6ce")}</DialogTitle>
              <DialogDescription>{selectedRound}{t("kor_pxc6")}</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid gap-3">
                <Label>{t("elso_jatekos_fq2d")}</Label>
                <Input
                  placeholder={t("kereses_swtb")}
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
                <Label>{t("masodik_jatekos_gmax")}</Label>
                <Input
                  placeholder={t("kereses_swtb")}
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
                <Label>{t("iro_opcionalis_b7mi")}</Label>
                <Input
                  placeholder={t("kereses_swtb")}
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
                <Label htmlFor="boardSelect">{t("tabla_1e8h")}</Label>
                <select
                  id="boardSelect"
                  value={selectedBoard}
                  onChange={(event) => setSelectedBoard(event.target.value)}
                  className="rounded-lg border border-border/40 bg-card/80 px-3 py-2 text-sm text-foreground shadow-sm shadow-black/15 focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">{t("valassz_tablat_w2ov")}</option>
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
                onClick={handleAddMatch}
                disabled={
                  loading ||
                  (!!selectedPlayer1 && !!selectedPlayer2 && selectedPlayer1 === selectedPlayer2) ||
                  ((!!selectedPlayer1 || !!selectedPlayer2) && !selectedBoard)
                }
              >
                {loading ? "Hozzáadás..." : "Hozzáadás"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showMatchEditModal} onOpenChange={setShowMatchEditModal}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0">
            <DialogHeader className="px-6 pt-6 pb-4 border-b">
              <DialogTitle>{t("meccs_eredmeny_rogzitese_h1ee")}</DialogTitle>
              <DialogDescription>
                {t("allitsd_be_a_legek_ifc6")}</DialogDescription>
            </DialogHeader>

            {selectedMatch && (
              <div className="p-6">
                  <div className="text-center text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground">{selectedMatch.player1?.name || "TBD"}</span>
                    <span className="mx-2 text-muted-foreground">vs</span>
                    <span className="font-semibold text-foreground">{selectedMatch.player2?.name || "TBD"}</span>
                  </div>

                  <div className="mt-5 grid gap-6 md:grid-cols-2">
                    <div className="space-y-4 p-1">
                      <h4 className="text-sm font-semibold text-foreground">{selectedMatch.player1?.name || "Player 1"}</h4>
                      <div className="grid gap-3">
                        <div className="grid gap-2">
                          <Label>{t("nyert_legek_es4r")}</Label>
                          <Input
                            type="number"
                            min={0}
                            max={15}
                            value={editForm.player1LegsWon ?? ''}
                            onNumberChange={(value) => setEditForm((prev) => ({
                              ...prev,
                              player1LegsWon: coerceNumericValue(value),
                            }))}
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label>{tTour('groups.dialog.average')}</Label>
                          <Input
                            type="number"
                            min={0}
                            max={200}
                            step={0.01}
                            parseMode="float"
                            value={editForm.player1Stats.average ?? ''}
                            onNumberChange={(value) => setEditForm((prev) => ({
                              ...prev,
                              player1Stats: {
                                ...prev.player1Stats,
                                average: coerceNumericValue(value),
                              },
                            }))}
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label>{t("180_ak_szama_r1fz")}</Label>
                          <Input
                            type="number"
                            min={0}
                            max={60}
                            value={editForm.player1Stats.oneEightiesCount ?? ''}
                            onNumberChange={(value) => setEditForm((prev) => ({
                              ...prev,
                              player1Stats: {
                                ...prev.player1Stats,
                                oneEightiesCount: coerceNumericValue(value),
                              },
                            }))}
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label>{t("legmagasabb_kiszallo_v119")}</Label>
                          <Input
                            type="number"
                            min={0}
                            max={170}
                            value={editForm.player1Stats.highestCheckout ?? ''}
                            onNumberChange={(value) => setEditForm((prev) => ({
                              ...prev,
                              player1Stats: {
                                ...prev.player1Stats,
                                highestCheckout: coerceNumericValue(value),
                              },
                            }))}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4 p-1">
                      <h4 className="text-sm font-semibold text-foreground">{selectedMatch.player2?.name || "Player 2"}</h4>
                      <div className="grid gap-3">
                        <div className="grid gap-2">
                          <Label>{t("nyert_legek_es4r")}</Label>
                          <Input
                            type="number"
                            min={0}
                            max={15}
                            value={editForm.player2LegsWon ?? ''}
                            onNumberChange={(value) => setEditForm((prev) => ({
                              ...prev,
                              player2LegsWon: coerceNumericValue(value),
                            }))}
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label>{tTour('groups.dialog.average')}</Label>
                          <Input
                            type="number"
                            min={0}
                            max={200}
                            step={0.01}
                            parseMode="float"
                            value={editForm.player2Stats.average ?? ''}
                            onNumberChange={(value) => setEditForm((prev) => ({
                              ...prev,
                              player2Stats: {
                                ...prev.player2Stats,
                                average: coerceNumericValue(value),
                              },
                            }))}
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label>{t("180_ak_szama_r1fz")}</Label>
                          <Input
                            type="number"
                            min={0}
                            max={60}
                            value={editForm.player2Stats.oneEightiesCount ?? ''}
                            onNumberChange={(value) => setEditForm((prev) => ({
                              ...prev,
                              player2Stats: {
                                ...prev.player2Stats,
                                oneEightiesCount: coerceNumericValue(value),
                              },
                            }))}
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label>{t("legmagasabb_kiszallo_v119")}</Label>
                          <Input
                            type="number"
                            min={0}
                            max={170}
                            value={editForm.player2Stats.highestCheckout ?? ''}
                            onNumberChange={(value) => setEditForm((prev) => ({
                              ...prev,
                              player2Stats: {
                                ...prev.player2Stats,
                                highestCheckout: coerceNumericValue(value),
                              },
                            }))}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
              </div>
            )}

            <DialogFooter className="px-6 py-4 border-t flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button onClick={handleSaveMatch} disabled={editForm.player1LegsWon === editForm.player2LegsWon}>
                {t("mentes_wz35")}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showMatchPlayerEditModal} onOpenChange={setShowMatchPlayerEditModal}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{t("meccs_parositas_szerkesztese_374y")}</DialogTitle>
              <DialogDescription>{t("allitsd_be_a_jatekosokat_lszw")}</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid gap-3">
                <Label>{t("elso_jatekos_fq2d")}</Label>
                <Input
                  placeholder={t("kereses_swtb")}
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
                <Label>{t("masodik_jatekos_gmax")}</Label>
                <Input
                  placeholder={t("kereses_swtb")}
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
                <Label>{t("iro_4axa")}</Label>
                <Input
                  placeholder={t("kereses_swtb")}
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
                  <Label>{t("tabla_1e8h")}</Label>
                  <select
                    value={editPairBoard}
                    onChange={(event) => setEditPairBoard(event.target.value)}
                    className="rounded-lg border border-border/40 bg-card/80 px-3 py-2 text-sm text-foreground shadow-sm shadow-black/15 focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">{t("valassz_tablat_w2ov")}</option>
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
              <Button onClick={handleUpdateMatchPlayer} disabled={loading}>
                {loading ? "Mentés..." : "Mentés"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showMatchSettingsModal} onOpenChange={setShowMatchSettingsModal}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{t("meccs_beallitasok_7eb7")}</DialogTitle>
              <DialogDescription>{t("allitsd_be_a_jatekosokat_lszw")}</DialogDescription>
            </DialogHeader>

            {editingMatchSettings && (
              <div className="space-y-4">
                <div className="grid gap-3">
                  <Label>{t("elso_jatekos_fq2d")}</Label>
                  <Input
                    placeholder={t("kereses_swtb")}
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
                  <Label>{t("masodik_jatekos_gmax")}</Label>
                  <Input
                    placeholder={t("kereses_swtb")}
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
                  <Label>{t("iro_4axa")}</Label>
                  <Input
                    placeholder={t("kereses_swtb")}
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
                  <Label>{t("tabla_1e8h")}</Label>
                  <select
                    value={selectedBoard}
                    onChange={(event) => setSelectedBoard(event.target.value)}
                    className="rounded-lg border border-border/40 bg-card/80 px-3 py-2 text-sm text-foreground shadow-sm shadow-black/15 focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">{t("valassz_tablat_w2ov")}</option>
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
              <Button onClick={handleSaveMatchSettings} disabled={loading}>
                {loading ? "Mentés..." : "Mentés"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showDeleteMatchModal} onOpenChange={setShowDeleteMatchModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{t("meccs_torlese_3k04")}</DialogTitle>
              <DialogDescription>{t("biztosan_torolni_szeretned_ezt_ft7i")}</DialogDescription>
            </DialogHeader>
            {matchToDelete?.match && (
              <Alert className="bg-destructive/10 text-destructive">
                <AlertTitle>{matchToDelete.match.player1?.name} vs {matchToDelete.match.player2?.name || "Üres"}</AlertTitle>
                <AlertDescription>{matchToDelete.round}{t("kor_pxc6")}</AlertDescription>
              </Alert>
            )}
            <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button variant="destructive" onClick={handleDeleteMatch} disabled={loading}>
                {loading ? "Törlés..." : "Törlés"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showDeleteLastRoundModal} onOpenChange={setShowDeleteLastRoundModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{t("utolso_kor_visszavonasa_cck2")}</DialogTitle>
              <DialogDescription>{t("az_osszes_meccs_torlodik_ylac")}</DialogDescription>
            </DialogHeader>
            <Alert className="bg-destructive/10 text-destructive">
              <AlertTitle>{t("figyelem_ikm5")}</AlertTitle>
              <AlertDescription>{t("ez_a_muvelet_nem_lw70")}</AlertDescription>
            </Alert>
            <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button variant="destructive" onClick={handleDeleteLastRound} disabled={loading}>
                {loading ? "Törlés..." : "Törlés"}
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
  const t = useTranslations("Tournament.components")
  return (
    <KnockoutErrorBoundary 
      tournamentCode={props.tournamentCode} 
      userClubRole={props.userClubRole}
      t={t}
    >
      <TournamentKnockoutBracketContent {...props} />
    </KnockoutErrorBoundary>
  )
}

export default TournamentKnockoutBracket