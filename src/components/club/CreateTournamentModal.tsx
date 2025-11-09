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
  IconTrophy,
  IconUsers,
  IconX,
} from "@tabler/icons-react"
import { useRouter } from "next/navigation"
import Link from "next/link"

import { TournamentSettings } from "@/interface/tournament.interface"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { FormField } from "@/components/ui/form-field"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"

interface CreateTournamentModalProps {
  isOpen: boolean
  onClose: () => void
  clubId: string
  userRole?: "admin" | "moderator" | "member" | "none"
  boardCount?: number
  onTournamentCreated: () => void
}

type Step = "details" | "boards" | "settings"

interface BoardInput {
  boardNumber: number
  name: string
}

const defaultSettings: TournamentSettings = {
  status: "pending",
  boardCount: 1,
  location: "",
  name: "",
  description: "",
  startDate: new Date(),
  entryFee: 0,
  maxPlayers: 16,
  format: "group",
  startingScore: 501,
  tournamentPassword: "",
  type: "amateur",
  registrationDeadline: new Date(),
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
}: CreateTournamentModalProps) {
  const router = useRouter()

  const [currentStep, setCurrentStep] = useState<Step>("details")
  const [settings, setSettings] = useState<TournamentSettings>(defaultSettings)
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

  useEffect(() => {
    if (isOpen) {
      fetchAvailableLeagues()
      setCurrentStep("details")
      setError("")
      setSubscriptionError(null)
      setBoards(initializeBoards(boardCount))
      setSettings(() => ({ ...defaultSettings, boardCount: initializeBoards(boardCount).length }))
    }
  }, [isOpen, clubId, boardCount])

  const fetchAvailableLeagues = async () => {
    try {
      const response = await fetch(`/api/clubs/${clubId}/leagues`)
      if (response.ok) {
        const data = await response.json()
        setAvailableLeagues(data.leagues || [])
      }
    } catch (err) {
      console.error("Error fetching leagues:", err)
    }
  }

  const handleSettingsChange = (field: keyof TournamentSettings, value: any) => {
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
        entryFee: settings.entryFee,
        maxPlayers: settings.maxPlayers,
        format: settings.format,
        startingScore: settings.startingScore,
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
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Új torna létrehozása</DialogTitle>
          <DialogDescription>Hozz létre egy új tornát a klubodban</DialogDescription>
        </DialogHeader>

        <div className="mb-6 flex items-center justify-between">
          {steps.map((step, idx) => {
            const StepIcon = step.icon
            const isActive = currentStep === step.id
            const isCompleted = getCurrentStepIndex() > idx

            return (
              <React.Fragment key={step.id}>
                <button
                  onClick={() => setCurrentStep(step.id as Step)}
                  className={cn(
                    "flex items-center gap-2 transition-all",
                    isActive && "text-primary",
                    !isActive && !isCompleted && "text-muted-foreground",
                    isCompleted && "text-emerald-500",
                  )}
                >
                  <div
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-full transition-all",
                      isActive && "bg-primary text-primary-foreground shadow-lg",
                      !isActive && !isCompleted && "bg-muted",
                      isCompleted && "bg-emerald-500 text-white",
                    )}
                  >
                    {isCompleted ? <IconCheck className="h-5 w-5" /> : <StepIcon className="h-5 w-5" />}
                  </div>
                  <span className="hidden text-sm font-medium sm:inline">{step.label}</span>
                </button>
                {idx < steps.length - 1 && (
                  <div className="mx-2 flex-1">
                    <Separator className={cn("transition-all", isCompleted ? "bg-emerald-500" : "bg-muted")}
                    />
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

        <Card>
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
                    value={settings.entryFee}
                    onChange={(event) => handleSettingsChange("entryFee", Number(event.target.value))}
                  />
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Típus</label>
                    <select
                      value={settings.type}
                      onChange={(event) => handleSettingsChange("type", event.target.value)}
                      className="flex h-11 w-full rounded-lg border  bg-background px-3 py-2 text-sm"
                    >
                      <option value="amateur">Amatőr</option>
                      <option value="open">Open</option>
                    </select>
                  </div>
                </div>
                <FormField
                  type="datetime-local"
                  label="Nevezési határidő"
                  value={new Date(settings.registrationDeadline).toLocaleString("sv-SE", {
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  }).replace(" ", "T")}
                  onChange={(event) => handleSettingsChange("registrationDeadline", new Date(event.target.value))}
                />
              </div>
            )}

            {currentStep === "boards" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">Táblák</h3>
                    <p className="text-sm text-muted-foreground">
                      Létrehozott táblák: <Badge variant="default">{boards.length} db</Badge>
                    </p>
                  </div>
                  <Button onClick={handleAddBoard} size="sm" className="gap-2">
                    <IconPlus className="h-4 w-4" /> Új tábla
                  </Button>
                </div>
                <Separator />
                <div className="max-h-[400px] space-y-3 overflow-y-auto">
                  {boards.map((board, index) => (
                    <Card key={index}>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                            <span className="font-bold">{index + 1}</span>
                          </div>
                          <FormField
                            placeholder={`Tábla ${index + 1}`}
                            value={board.name}
                            onChange={(event) => handleBoardChange(index, "name", event.target.value)}
                            className="flex-1"
                          />
                          {boards.length > 1 && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveBoard(index)}
                              className="text-destructive"
                            >
                              <IconX className="h-5 w-5" />
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {currentStep === "settings" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Formátum</label>
                  <select
                    value={settings.format}
                    onChange={(event) => handleSettingsChange("format", event.target.value)}
                    className="flex h-11 w-full rounded-lg border  bg-background px-3 py-2 text-sm"
                  >
                    <option value="group">Csak csoportkör</option>
                    <option value="knockout">Csak egyenes kiesés</option>
                    <option value="group_knockout">Csoportkör + Egyenes kiesés</option>
                  </select>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField
                    type="number"
                    label="Kezdő pontszám"
                    value={settings.startingScore}
                    onChange={(event) => handleSettingsChange("startingScore", Number(event.target.value))}
                    helperText="101-1001"
                  />
                  <FormField
                    type="number"
                    label="Max. játékosok"
                    value={settings.maxPlayers}
                    onChange={(event) => handleSettingsChange("maxPlayers", Number(event.target.value))}
                    helperText="Min. 4 fő"
                    icon={<IconUsers className="h-5 w-5" />}
                    required
                  />
                </div>
                <FormField
                  label="Torna jelszó"
                  placeholder="Jelszó a táblákhoz való csatlakozáshoz"
                  value={settings.tournamentPassword}
                  onChange={(event) => handleSettingsChange("tournamentPassword", event.target.value)}
                  helperText="Ezt a jelszót kell megadni a játékosoknak a csatlakozáshoz"
                  required
                />
                {availableLeagues.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Liga hozzárendelés</label>
                    <select
                      value={selectedLeagueId}
                      onChange={(event) => setSelectedLeagueId(event.target.value)}
                      className="flex h-11 w-full rounded-lg border  bg-background px-3 py-2 text-sm"
                    >
                      <option value="">Nincs liga hozzárendelés</option>
                      {availableLeagues
                        .filter((league) => league.isActive)
                        .map((league) => (
                          <option key={league._id} value={league._id}>
                            {league.name}
                          </option>
                        ))}
                    </select>
                    <p className="text-xs text-muted-foreground">
                      Ha kiválasztasz egy ligát, a verseny eredményei automatikusan hozzáadódnak a liga ranglistához.
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-between">
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Mégse
          </Button>
          <div className="flex items-center gap-2">
            {getCurrentStepIndex() > 0 && (
              <Button variant="outline" onClick={handleBack} disabled={isSubmitting}>
                Vissza
              </Button>
            )}
            {currentStep !== "settings" ? (
              <Button onClick={handleNext} disabled={!canProceed() || isSubmitting} className="gap-2">
                Tovább
                <IconChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={!canProceed() || isSubmitting} className="gap-2">
                {isSubmitting ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    Létrehozás...
                  </>
                ) : (
                  <>
                    <IconCheck className="h-4 w-4" />
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

