import React, { useEffect, useState } from "react"
import {
  IconCalendar,
  IconCheck,
  IconChevronRight,
  IconExternalLink,
  IconMapPin,
  IconPlus,
  IconSettings,
  IconTable,
  IconTarget,
  IconTrophy,
  IconUsers,
  IconTrash,
  IconInfoCircle,
  IconEye,
  IconEyeOff,
} from "@tabler/icons-react"
import { useRouter } from "next/navigation"
import Link from "next/link"

import { TournamentSettings } from "@/interface/tournament.interface"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/Button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { FormField } from "@/components/ui/form-field"
import { Label } from "@/components/ui/Label"
import { Card, CardContent } from "@/components/ui/Card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"

interface CreateTournamentModalProps {
  isOpen: boolean
  onClose: () => void
  clubId: string
  userRole?: "admin" | "moderator" | "member" | "none"
  boardCount?: number
  onTournamentCreated: () => void
  preSelectedLeagueId?: string  // Optional pre-selected league
  lockLeagueSelection?: boolean  // If true, league selection is locked
  defaultIsSandbox?: boolean
}

type Step = "details" | "boards" | "settings"

interface FormSettings extends TournamentSettings {
  isSandbox?: boolean
}

interface BoardInput {
  boardNumber: number
  name: string
}

const defaultSettings: FormSettings = {
  status: "pending",
  boardCount: 1,
  location: "",
  name: "",
  description: "",
  startDate: new Date(),
  entryFee: 0,
  maxPlayers: 16,
  format: "group_knockout",
  startingScore: 501,
  tournamentPassword: "",
  type: "amateur",
  registrationDeadline: new Date(),
  isSandbox: false,
}

const steps = [
  { id: "details", label: "Alapadatok", icon: IconTrophy },
  { id: "boards", label: "Táblák", icon: IconTable },
  { id: "settings", label: "Beállítások", icon: IconSettings },
]

const initializeBoards = (initialCount?: number): BoardInput[] => {
  const count = Math.max(1, initialCount ?? 1)
  return Array.from({ length: count }, (_, idx) => ({
    boardNumber: idx + 1,
    name: `Tábla ${idx + 1}`,
  }))
}

export default function CreateTournamentModal({
  isOpen,
  onClose,
  clubId,
  boardCount,
  onTournamentCreated,
  preSelectedLeagueId,
  lockLeagueSelection = false,
  defaultIsSandbox = false,
}: CreateTournamentModalProps) {
  const router = useRouter()

  const [currentStep, setCurrentStep] = useState<Step>("details")
  const [settings, setSettings] = useState<FormSettings>(defaultSettings)
  const [boards, setBoards] = useState<BoardInput[]>(initializeBoards(boardCount))
  const [availableLeagues, setAvailableLeagues] = useState<any[]>([])
  const [selectedLeagueId, setSelectedLeagueId] = useState<string>("")
  const [error, setError] = useState<string>("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [subscriptionError, setSubscriptionError] = useState<{
    currentCount: number
    maxAllowed: number
    planName: string
  } | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    if (isOpen) {
      fetchAvailableLeagues()
      setCurrentStep("details")
      setError("")
      setSubscriptionError(null)
      setBoards(initializeBoards(boardCount))
      setBoards(initializeBoards(boardCount))
      setSettings(() => ({ ...defaultSettings, boardCount: initializeBoards(boardCount).length, isSandbox: defaultIsSandbox }))
      // Set pre-selected league if provided
      if (preSelectedLeagueId) {
        setSelectedLeagueId(preSelectedLeagueId)
      }
    }
  }, [isOpen, clubId, boardCount, preSelectedLeagueId, defaultIsSandbox])

  const fetchAvailableLeagues = async () => {
    try {
      const response = await fetch(`/api/clubs/${clubId}/leagues`)
      if (response.ok) {
        const data = await response.json()
        // Filter out inactive/terminated leagues
        const activeLeagues = (data.leagues || []).filter((league: any) => league.isActive !== false)
        setAvailableLeagues(activeLeagues)
      }
    } catch (err) {
      console.error("Error fetching leagues:", err)
    }
  }

  const handleSettingsChange = (field: keyof FormSettings, value: any) => {
    setSettings((prev) => ({ ...prev, [field]: value }))
    setError("")
  }

  const handleAddBoard = () => {
    const newBoardNumber = boards.length > 0 ? Math.max(...boards.map((b) => b.boardNumber)) + 1 : 1
    setBoards((prev) => [...prev, { boardNumber: newBoardNumber, name: `Tábla ${newBoardNumber}` }])
  }

  const handleRemoveBoard = (index: number) => {
    if (boards.length > 1) {
      setBoards((prev) => prev.filter((_, i) => i !== index))
    }
  }

  const handleBoardChange = (index: number, field: keyof BoardInput, value: string | number) => {
    setBoards((prev) => prev.map((board, i) => (i === index ? { ...board, [field]: value } : board)))
  }

  const getCurrentStepIndex = () => steps.findIndex((s) => s.id === currentStep)

  const canProceed = () => {
    if (currentStep === "details") {
      return Boolean(settings.name) && Boolean(settings.startDate)
    }
    if (currentStep === "boards") {
      return boards.length > 0
    }
    if (currentStep === "settings") {
      return Boolean(settings.tournamentPassword) && settings.maxPlayers >= 4
    }
    return false
  }

  const handleNext = () => {
    const currentIndex = getCurrentStepIndex()
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1].id as Step)
      setError("")
    }
  }

  const handleBack = () => {
    const currentIndex = getCurrentStepIndex()
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1].id as Step)
      setError("")
    }
  }

  const handleSubmit = async () => {
    setError("")
    setSubscriptionError(null)
    setIsSubmitting(true)

    try {
      const payload = {
        name: settings.name,
        description: settings.description,
        startDate: settings.startDate,
        entryFee: settings.entryFee === '' as unknown as number ? 0 : settings.entryFee,
        maxPlayers: settings.maxPlayers === '' as unknown as number ? 0 : settings.maxPlayers,
        format: settings.format,
        startingScore: settings.startingScore === '' as unknown as number ? 0 : settings.startingScore,
        tournamentPassword: settings.tournamentPassword,
        boardCount: boards.length,
        boards: boards.map((b, idx) => ({
          boardNumber: idx + 1,
          name: b.name || `Tábla ${idx + 1}`,
          status: "idle",
          isActive: true,
        })),
        location: settings.location,
        type: settings.type,
        registrationDeadline: settings.registrationDeadline,
        leagueId: selectedLeagueId || undefined,
        isSandbox: settings.isSandbox || false,
      }

      const response = await fetch(`/api/clubs/${clubId}/createTournament`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = await response.json()
        if (errorData.subscriptionError) {
          setSubscriptionError({
            currentCount: errorData.currentCount,
            maxAllowed: errorData.maxAllowed,
            planName: errorData.planName,
          })
        }
        setError(errorData.error || "Hiba történt a torna létrehozása során")
        return
      }

      const data = await response.json()
      onTournamentCreated()
      onClose()

      if (data.tournamentId || data.code) {
        router.push(`/tournaments/${data.tournamentId || data.code}`)
      }
    } catch (err: any) {
      setError(err.message || "Hiba történt a torna létrehozása során")
      console.error("Create tournament error:", err)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="flex max-h-[90vh] max-w-3xl flex-col overflow-hidden bg-gradient-to-br from-card/98 to-card/95 backdrop-blur-xl p-0 shadow-2xl shadow-primary/20"
      >
        <DialogHeader className="bg-gradient-to-r from-primary/10 to-transparent px-4 md:px-6 py-3 md:py-4 shadow-sm shadow-primary/10">
          <DialogTitle className="text-xl md:text-2xl text-foreground">Új torna létrehozása</DialogTitle>
          <DialogDescription className="text-sm">Hozz létre egy új tornát a klubodban</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 md:py-6">
          <div className="mb-4 md:mb-6 flex items-center justify-between gap-2">
            {steps.map((step, idx) => {
              const StepIcon = step.icon
              const isActive = currentStep === step.id
              const isCompleted = getCurrentStepIndex() > idx

              return (
                <React.Fragment key={step.id}>
                  <button
                    key={step.id}
                    onClick={() => setCurrentStep(step.id as Step)}
                    className={cn(
                      "flex items-center gap-1.5 md:gap-2 text-xs md:text-sm transition-all duration-200",
                      isActive ? "text-primary scale-105" : isCompleted ? "text-success" : "text-muted-foreground",
                    )}
                  >
                    <div
                      className={cn(
                        "flex items-center justify-center rounded-full transition-all duration-200",
                        "size-9 md:size-11",
                        isActive && "bg-primary shadow-lg shadow-primary/40",
                        !isActive && !isCompleted && "bg-muted/60",
                        isCompleted && "bg-success shadow-lg shadow-success/40",
                      )}
                    >
                      {isCompleted ? (
                        <IconCheck size={20} className="text-white" />
                      ) : (
                        <StepIcon size={20} className={isActive ? "text-white" : "text-current"} />
                      )}
                    </div>
                    <span className="hidden text-xs md:text-sm font-medium sm:inline">{step.label}</span>
                  </button>
                  {idx < steps.length - 1 && (
                    <div className="mx-1 md:mx-2 flex-1">
                      <Separator className={cn("transition-all h-0.5", isCompleted ? "bg-success" : "bg-muted")} />
                    </div>
                  )}
                </React.Fragment>
              )
            })}
          </div>

          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <p className="font-medium">{error}</p>
                    {subscriptionError && (
                      <div className="text-sm">
                        <p>
                          Jelenlegi csomag: <span className="font-semibold">{subscriptionError.planName}</span>
                        </p>
                        <p>
                          Havi versenyek: {subscriptionError.currentCount} / {subscriptionError.maxAllowed === -1 ? 'Korlátlan' : subscriptionError.maxAllowed}
                        </p>
                      </div>
                    )}
                  </div>
                  {subscriptionError && (
                    <Link href="/#pricing" onClick={onClose} className="shrink-0">
                      <Button size="sm" className="gap-2">
                        <IconExternalLink className="h-4 w-4" /> Csomagok
                      </Button>
                    </Link>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          <Card className="bg-gradient-to-br from-card/95 to-card/80 backdrop-blur-sm shadow-lg shadow-primary/10">
            <CardContent className="pt-6">
              {currentStep === "details" && (
                <div className="space-y-4">
                  <FormField
                    label="Torna neve"
                    placeholder="Pl.: Nyári Darts Bajnokság 2024"
                    value={settings.name}
                    onChange={(event) => handleSettingsChange("name", event.target.value)}
                    icon={<IconTrophy className="h-5 w-5" />}
                    required
                  />
                  <FormField
                    label="Leírás"
                    placeholder="Add meg a torna részleteit..."
                    value={settings.description}
                    onChange={(event) => handleSettingsChange("description", event.target.value)}
                    helperText="Opcionális, de segít a játékosoknak megérteni a torna célját."
                  />
                  <FormField
                    type="datetime-local"
                    label="Kezdés időpontja"
                    value={new Date(settings.startDate).toLocaleString("sv-SE", {
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    }).replace(" ", "T")}
                    onChange={(event) => handleSettingsChange("startDate", new Date(event.target.value))}
                    icon={<IconCalendar className="h-5 w-5" />}
                    required
                  />
                  <FormField
                    label="Helyszín"
                    placeholder="Pl.: Budapest, Sport Klub"
                    value={settings.location}
                    onChange={(event) => handleSettingsChange("location", event.target.value)}
                    icon={<IconMapPin className="h-5 w-5" />}
                  />
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField
                      type="number"
                      label="Nevezési díj (Ft)"
                      placeholder="0"
                      min={0}
                      value={settings.entryFee ?? ''}
                      onChange={(event) => handleSettingsChange("entryFee", event.target.value === '' ? '' : Number(event.target.value))}
                    />
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Típus</label>
                      <select
                        value={settings.type}
                        onChange={(event) => handleSettingsChange("type", event.target.value)}
                        className="flex h-11 w-full rounded-lg bg-background/90 px-3 py-2 text-sm ring-1 ring-inset ring-white/10 focus:outline-none focus:ring-2 focus:ring-primary/40"
                      >
                        <option value="amateur">Amatőr</option>
                        <option value="open">Open</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {currentStep === "boards" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Táblák beállítása</h3>
                    <Button onClick={handleAddBoard} variant="outline" className="gap-2">
                      <IconPlus className="h-4 w-4" />
                      Új tábla
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Adj meg annyi táblát, amennyi egyszerre használható lesz a tornán.
                  </p>
                  <div className="space-y-3">
                    {boards.map((board, index) => (
                      <div
                        key={board.boardNumber}
                        className="rounded-xl bg-muted/15 px-4 py-3"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex-1 space-y-2">
                            <label className="text-sm font-medium">Tábla {board.boardNumber}</label>
                            <input
                              type="text"
                              value={board.name}
                              onChange={(event) => handleBoardChange(index, "name", event.target.value)}
                              className="h-11 w-full rounded-lg border border-border/40 bg-background px-3 py-2 text-sm"
                            />
                          </div>
                          {boards.length > 1 && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveBoard(index)}
                              className="text-destructive hover:text-destructive"
                            >
                              <IconTrash className="h-5 w-5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {currentStep === "settings" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField
                      type="number"
                      label="Maximális létszám"
                      placeholder="16"
                      min={0}
                      value={settings.maxPlayers ?? ''}
                      onChange={(event) => handleSettingsChange("maxPlayers", event.target.value === '' ? '' : Number(event.target.value))}
                      icon={<IconUsers className="h-5 w-5" />}
                      required
                    />
                    <FormField
                      type="number"
                      label="Kezdő pontszám"
                      placeholder="501"
                      min={0}
                      value={settings.startingScore ?? ''}
                      onChange={(event) => handleSettingsChange("startingScore", event.target.value === '' ? '' : Number(event.target.value))}
                      icon={<IconTarget className="h-5 w-5" />}
                      required
                    />
                  </div>
                  
                  {/* Tournament Password - Full Width */}
                  <div className="space-y-2">
                    <Label className="text-foreground font-medium">
                      Torna jelszó
                    </Label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        placeholder="Add meg a jelszót a jelszóval védett tornához"
                        value={settings.tournamentPassword}
                        onChange={(event) => handleSettingsChange("tournamentPassword", event.target.value)}
                        className="flex h-11 w-full rounded-lg bg-muted/20 backdrop-blur-md border border-border px-3 py-2 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent focus-visible:border-primary/50 focus-visible:bg-muted/30 transition-all duration-200"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPassword ? (
                          <IconEyeOff className="h-5 w-5" />
                        ) : (
                          <IconEye className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Format and League - Bottom Row */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-foreground font-medium">
                        Torna formátum
                      </Label>
                      <select
                        value={settings.format}
                        onChange={(event) => handleSettingsChange("format", event.target.value)}
                        className="flex h-11 w-full rounded-lg bg-muted/20 backdrop-blur-md border border-border px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent focus-visible:border-primary/50 focus-visible:bg-muted/30 transition-all duration-200"
                      >
                        <option value="group">Csoportkör</option>
                        <option value="knockout">Kieséses</option>
                        <option value="group_knockout">Csoportkör + Kieséses</option>
                      </select>
                      <p className="text-sm text-muted-foreground">
                        Válaszd ki a torna formátumát. A csoportkör + kieséses formátum először csoportkört játszik, majd kieséses szakasz következik.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-foreground font-medium">
                        Ligához csatolás {lockLeagueSelection && <span className="text-xs text-warning">(OAC liga - rögzített)</span>}
                      </Label>
                      <select
                        value={selectedLeagueId}
                        onChange={(event) => setSelectedLeagueId(event.target.value)}
                        disabled={lockLeagueSelection}
                        className="flex h-11 w-full rounded-lg bg-muted/20 backdrop-blur-md border border-border px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent focus-visible:border-primary/50 focus-visible:bg-muted/30 transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="">Válassz ligát</option>
                        {availableLeagues.map((league) => (
                          <option key={league._id} value={league._id}>
                            {league.name}{league.verified ? ' (OAC Liga)' : ''}
                          </option>
                        ))}
                      </select>
                      <p className="text-sm text-muted-foreground">
                        {lockLeagueSelection ? 'Ez egy OAC verseny, a liga automatikusan ki van választva.' : 'Válassz ligát, ha szeretnéd a tornát ligához kötni.'}
                      </p>
                    </div>
                  </div>
                  <Alert className="border-primary/60 bg-primary/10">
                    <AlertDescription className="flex items-start gap-3 text-sm">
                      <IconInfoCircle className="h-5 w-5 text-primary" />
                      <span>
                        A torna jelszó beállítása kötelező, hogy csak meghívott játékosok csatlakozhassanak.
                      </span>
                    </AlertDescription>
                  </Alert>

                  {/* Sandbox Mode Toggle */}
                  <div className="flex items-center space-x-2 rounded-lg border border-warning/50 bg-warning/10 p-4">
                    <div className="flex-1 space-y-1">
                      <Label htmlFor="sandbox-mode" className="font-medium text-warning">Sandbox Mód (Teszt)</Label>
                      <p className="text-sm text-muted-foreground">
                        A sandbox versenyek nem jelennek meg a publikus keresőben, és nem számítanak bele a statisztikákba. Ideális rendszer teszteléshez.
                      </p>
                      {lockLeagueSelection && <p className="text-xs text-muted-foreground italic">OAC versenyek nem lehetnek sandbox módban.</p>}
                    </div>
                    <input
                      id="sandbox-mode"
                      type="checkbox"
                      checked={settings.isSandbox || false}
                      onChange={(e) => handleSettingsChange("isSandbox", e.target.checked)}
                      disabled={lockLeagueSelection} // Disable for OAC tournaments
                      className="h-5 w-5 rounded border-warning text-warning focus:ring-warning disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <DialogFooter className="flex flex-col gap-2 bg-gradient-to-r from-transparent to-primary/5 px-4 md:px-6 py-3 md:py-4 sm:flex-row sm:items-center sm:justify-between shadow-[0_-4px_12px_rgba(0,0,0,0.1)]">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isSubmitting} className="md:size-default">
            Mégse
          </Button>
          <div className="flex items-center gap-2">
            {getCurrentStepIndex() > 0 && (
              <Button variant="outline" size="sm" onClick={handleBack} disabled={isSubmitting} className="md:size-default">
                Vissza
              </Button>
            )}
            {currentStep !== "settings" ? (
              <Button onClick={handleNext} disabled={!canProceed() || isSubmitting} size="sm" className="md:size-default gap-1">
                Tovább
                <IconChevronRight size={16} />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={!canProceed() || isSubmitting} size="sm" className="md:size-default gap-1.5 shadow-lg shadow-primary/30">
                {isSubmitting ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                    Létrehozás...
                  </>
                ) : (
                  <>
                    <IconCheck size={16} />
                    Torna létrehozása
                  </>
                )}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

