import React, { useEffect, useState } from "react"
import { toast } from "react-hot-toast"
import {
  IconCalendar,
  IconCheck,
  IconChevronRight,
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
  IconReceipt,
  IconCreditCard,
} from "@tabler/icons-react"
import { useRouter } from "next/navigation"

import { TournamentSettings } from "@/interface/tournament.interface"
import { BillingInfo } from "@/interface/club.interface"
import { cn } from "@/lib/utils"
import { FeatureFlagService } from "@/lib/featureFlags"
import { Button } from "@/components/ui/Button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { FormField } from "@/components/ui/form-field"
import { Label } from "@/components/ui/Label"
import { Card, CardContent } from "@/components/ui/Card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { useTranslations } from "next-intl"

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

type Step = "details" | "boards" | "settings" | "billing"

interface FormSettings extends TournamentSettings {
  isSandbox?: boolean
  billingInfo?: BillingInfo
  saveBillingInfo?: boolean
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
  participationMode: 'individual',
  isSandbox: false,
  billingInfo: {
    type: 'individual',
    name: '',
    country: 'HU',
    city: '',
    zip: '',
    address: '',
    email: '',
  },
  saveBillingInfo: false,
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
  const t = useTranslations('Club.create_tournament_modal')
  const router = useRouter()
  const isOacCreationEnabled = FeatureFlagService.isEnvFeatureEnabled('OAC_CREATION')

  const steps = [
    { id: "details", label: t('steps.details'), icon: IconTrophy },
    { id: "boards", label: t('steps.boards'), icon: IconTable },
    { id: "settings", label: t('steps.settings'), icon: IconSettings },
    { id: "billing", label: t('steps.billing'), icon: IconReceipt },
  ]

  const initializeBoards = (initialCount?: number): BoardInput[] => {
    const count = Math.max(1, initialCount ?? 1)
    return Array.from({ length: count }, (_, idx) => ({
      boardNumber: idx + 1,
      name: t('boards.default_board_name', { number: idx + 1 }),
    }))
  }

  const [currentStep, setCurrentStep] = useState<Step>("details")
  const [settings, setSettings] = useState<FormSettings>(defaultSettings)
  const [boards, setBoards] = useState<BoardInput[]>(initializeBoards(boardCount))
  const [availableLeagues, setAvailableLeagues] = useState<any[]>([])
  const [selectedLeagueId, setSelectedLeagueId] = useState<string>("")
  const [error, setError] = useState<string>("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    if (isOpen) {
      fetchAvailableLeagues()
      fetchClubBillingInfo()
      setCurrentStep("details")
      setError("")
      setBoards(initializeBoards(boardCount))
      setSettings(() => ({ ...defaultSettings, boardCount: initializeBoards(boardCount).length, isSandbox: defaultIsSandbox }))
      // Set pre-selected league if provided
      if (preSelectedLeagueId) {
        setSelectedLeagueId(preSelectedLeagueId)
      }
    }
  }, [isOpen, clubId, boardCount, preSelectedLeagueId, defaultIsSandbox])

  const isOac = React.useMemo(() => {
    const selectedLeague = availableLeagues.find(l => l._id === selectedLeagueId)
    return selectedLeague?.verified || false
  }, [availableLeagues, selectedLeagueId])

  useEffect(() => {
    if (isOac) {
      const minDate = new Date("2026-01-15T00:00:00");
      setSettings(prev => ({
        ...prev,
        isSandbox: false, // OAC tournaments cannot be sandbox
        ...(prev.startDate < minDate ? {
          startDate: minDate,
          registrationDeadline: minDate
        } : {})
      }));
    }
  }, [isOac]);

  const fetchClubBillingInfo = async () => {
    try {
      const response = await fetch(`/api/clubs/${clubId}`)
      if (response.ok) {
        const data = await response.json()
        if (data.club?.billingInfo) {
          setSettings(prev => ({
            ...prev,
            saveBillingInfo: true,
            billingInfo: {
              ...prev.billingInfo,
              ...data.club.billingInfo
            } as BillingInfo
          }))
        }
      }
    } catch (err) {
      console.error("Error fetching club billing info:", err)
    }
  }

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
    // If startDate changes, automatically update registrationDeadline to match it
    if (field === 'startDate') {
      setSettings((prev) => ({ 
        ...prev, 
        [field]: value,
        registrationDeadline: value 
      }))
    } else {
      setSettings((prev) => ({ ...prev, [field]: value }))
    }
    setError("")
  }

  const handleBillingChange = (field: keyof BillingInfo, value: any) => {
    setSettings((prev) => ({
      ...prev,
      billingInfo: {
        ...(prev.billingInfo as BillingInfo),
        [field]: value
      }
    }))
  }

  const handleAddBoard = () => {
    const newBoardNumber = boards.length > 0 ? Math.max(...boards.map((b) => b.boardNumber)) + 1 : 1
    setBoards((prev) => [...prev, { boardNumber: newBoardNumber, name: t('boards.default_board_name', { number: newBoardNumber }) }])
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
    if (currentStep === "billing") {
      const b = settings.billingInfo
      if (!b) return false
      const common = b.name && b.email && b.city && b.zip && b.address
      if (b.type === 'company') {
        return Boolean(common && b.taxId)
      }
      return Boolean(common)
    }
    return false
  }


  const visibleSteps = React.useMemo(() => {
    if (isOac) return steps
    return steps.filter(s => s.id !== 'billing')
  }, [isOac, steps])

  const handleNext = () => {
    const currentIndex = visibleSteps.findIndex((s) => s.id === currentStep)
    if (currentIndex < visibleSteps.length - 1) {
      setCurrentStep(visibleSteps[currentIndex + 1].id as Step)
      setError("")
    }
  }

  const handleBack = () => {
    const currentIndex = visibleSteps.findIndex((s) => s.id === currentStep)
    if (currentIndex > 0) {
      setCurrentStep(visibleSteps[currentIndex - 1].id as Step)
      setError("")
    }
  }

  const handleSubmit = async () => {
    setError("")
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
          name: b.name || t('boards.default_board_name', { number: idx + 1 }),
          status: "idle",
          isActive: true,
        })),
        location: settings.location,
        type: settings.type,
        registrationDeadline: settings.registrationDeadline,
        leagueId: selectedLeagueId || undefined,
        isSandbox: settings.isSandbox || false,
        verified: isOac,
        billingInfo: isOac ? settings.billingInfo : undefined,
        saveBillingInfo: isOac ? settings.saveBillingInfo : false,
        participationMode: settings.participationMode || 'individual',
      }

      const response = await fetch(`/api/clubs/${clubId}/createTournament`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = await response.json()
        const errorMsg = errorData.error || t('errors.default')
        setError(errorMsg)
        toast.error(errorMsg)
        return
      }

      const data = await response.json()
      
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl
        return
      }

      onTournamentCreated()
      onClose()

      if (data.tournamentId || data.code) {
        router.push(`/tournaments/${data.tournamentId || data.code}`)
      }
    } catch (err: any) {
      const errorMsg = err.message || t('errors.default')
      setError(errorMsg)
      toast.error(errorMsg)
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
          <DialogTitle className="text-xl md:text-2xl text-foreground">{t('title')}</DialogTitle>
          <DialogDescription className="text-sm">{t('subtitle')}</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 md:py-6">
          <div className="mb-4 md:mb-6 flex items-center justify-between gap-2">
            {visibleSteps.map((step, idx) => {
              const StepIcon = step.icon
              const isActive = currentStep === step.id
              const stepIndex = visibleSteps.findIndex(s => s.id === step.id)
              const currentStepIndex = visibleSteps.findIndex(s => s.id === currentStep)
              const isCompleted = currentStepIndex > stepIndex

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
                  {idx < visibleSteps.length - 1 && (
                    <div className="mx-1 md:mx-2 flex-1">
                      <Separator className={cn("transition-all h-0.5", isCompleted ? "bg-success" : "bg-muted")} />
                    </div>
                  )}
                </React.Fragment>
              )
            })}
          </div>


          {/* Error Alert removed as per user request to show it in footer */}

          <Card className="bg-gradient-to-br from-card/95 to-card/80 backdrop-blur-sm shadow-lg shadow-primary/10">
            <CardContent className="pt-6">
              {currentStep === "details" && (
                <div className="space-y-4">
                  <FormField
                    label={t('details.name_label')}
                    placeholder={t('details.name_placeholder')}
                    value={settings.name}
                    onChange={(event) => handleSettingsChange("name", event.target.value)}
                    icon={<IconTrophy className="h-5 w-5" />}
                    required
                  />
                  <FormField
                    label={t('details.desc_label')}
                    placeholder={t('details.desc_placeholder')}
                    value={settings.description}
                    onChange={(event) => handleSettingsChange("description", event.target.value)}
                    helperText={t('details.desc_helper')}
                  />
                  <FormField
                    type="datetime-local"
                    label={t('details.start_label')}
                    value={new Date(settings.startDate).toLocaleString("sv-SE", {
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    }).replace(" ", "T")}
                    onChange={(event) => handleSettingsChange("startDate", new Date(event.target.value))}
                    min={isOac ? "2026-01-15T00:00" : undefined}
                    icon={<IconCalendar className="h-5 w-5" />}
                    required
                  />
                  <FormField
                    type="datetime-local"
                    label={t('details.deadline_label')}
                    value={new Date(settings.registrationDeadline || settings.startDate).toLocaleString("sv-SE", {
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    }).replace(" ", "T")}
                    onChange={(event) => handleSettingsChange("registrationDeadline", new Date(event.target.value))}
                    min={isOac ? "2026-02-01T00:00" : undefined}
                    icon={<IconCalendar className="h-5 w-5" />}
                  />
                  <FormField
                    label={t('details.location_label')}
                    placeholder={t('details.location_placeholder')}
                    value={settings.location}
                    onChange={(event) => handleSettingsChange("location", event.target.value)}
                    icon={<IconMapPin className="h-5 w-5" />}
                  />
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField
                      type="number"
                      label={t('details.fee_label')}
                      placeholder="0"
                      min={0}
                      max={isOac ? 3000 : undefined}
                      value={settings.entryFee ?? ''}
                      onChange={(event) => handleSettingsChange("entryFee", event.target.value === '' ? '' : Number(event.target.value))}
                    />
                    <div className="space-y-2">
                      <label className="text-sm font-medium">{t('details.type_label')}</label>
                      <select
                        value={settings.type}
                        onChange={(event) => handleSettingsChange("type", event.target.value)}
                        className="flex h-11 w-full rounded-lg bg-background/90 px-3 py-2 text-sm ring-1 ring-inset ring-white/10 focus:outline-none focus:ring-2 focus:ring-primary/40"
                      >
                        <option value="amateur">{t('details.type_amateur')}</option>
                        <option value="open">{t('details.type_open')}</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {currentStep === "boards" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">{t('boards.title')}</h3>
                    <Button onClick={handleAddBoard} variant="outline" className="gap-2">
                      <IconPlus className="h-4 w-4" />
                      {t('boards.add_board')}
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t('boards.description')}
                  </p>
                  <div className="space-y-3">
                    {boards.map((board, index) => (
                      <div
                        key={board.boardNumber}
                        className="rounded-xl bg-muted/15 px-4 py-3"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex-1 space-y-2">
                            <label className="text-sm font-medium">{t('boards.board_label', { number: board.boardNumber })}</label>
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
                      label={t('settings.max_players_label')}
                      placeholder="16"
                      min={0}
                      value={settings.maxPlayers ?? ''}
                      onChange={(event) => handleSettingsChange("maxPlayers", event.target.value === '' ? '' : Number(event.target.value))}
                      icon={<IconUsers className="h-5 w-5" />}
                      required
                    />
                    <FormField
                      type="number"
                      label={t('settings.starting_score_label')}
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
                      {t('settings.password_label')}
                    </Label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        placeholder={t('settings.password_placeholder')}
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
                        {t('settings.format_label')}
                      </Label>
                      <select
                        value={settings.format}
                        onChange={(event) => handleSettingsChange("format", event.target.value)}
                        className="flex h-11 w-full rounded-lg bg-muted/20 backdrop-blur-md border border-border px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent focus-visible:border-primary/50 focus-visible:bg-muted/30 transition-all duration-200"
                      >
                        <option value="group">{t('settings.format_group')}</option>
                        <option value="knockout">{t('settings.format_knockout')}</option>
                        <option value="group_knockout">{t('settings.format_group_knockout')}</option>
                      </select>
                      <p className="text-sm text-muted-foreground">
                        {t('settings.format_desc')}
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-foreground font-medium">
                        {t('settings.mode_label')}
                      </Label>
                      <select
                        value={settings.participationMode || 'individual'}
                        onChange={(event) => handleSettingsChange("participationMode", event.target.value)}
                         className="flex h-11 w-full rounded-lg bg-muted/20 backdrop-blur-md border border-border px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent focus-visible:border-primary/50 focus-visible:bg-muted/30 transition-all duration-200"
                      >
                        <option value="individual">{t('settings.mode_individual')}</option>
                        <option value="pair">{t('settings.mode_pair')}</option>
                        <option value="team" disabled>{t('settings.mode_team')}</option>
                      </select>
                      <p className="text-sm text-muted-foreground">
                        {t('settings.mode_desc')}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-foreground font-medium">
                        {t('settings.league_label')} {lockLeagueSelection && <span className="text-xs text-warning">{t('settings.league_oac_fixed')}</span>}
                      </Label>
                      <select
                        value={selectedLeagueId}
                        onChange={(event) => setSelectedLeagueId(event.target.value)}
                        disabled={lockLeagueSelection}
                        className="flex h-11 w-full rounded-lg bg-muted/20 backdrop-blur-md border border-border px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent focus-visible:border-primary/50 focus-visible:bg-muted/30 transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="">{t('settings.league_placeholder')}</option>
                        {availableLeagues
                          .filter(league => {
                            // If we are in OAC mode (locked selection), show all (or specifically verified)
                            // If we are NOT in OAC mode, hide verified leagues
                            if (lockLeagueSelection) return true;
                            return !league.verified || league.name.includes("OAC 2026");
                          })
                          .map((league) => (
                          <option key={league._id} value={league._id}>
                            {league.name}{league.verified ? t('settings.league_oac_suffix') : ''}
                          </option>
                        ))}
                      </select>
                      <p className="text-sm text-muted-foreground">
                        {lockLeagueSelection ? t('settings.league_oac_desc') : t('settings.league_normal_desc')}
                      </p>
                    </div>
                  </div>
                  <Alert className="border-primary/60 bg-primary/10">
                    <AlertDescription className="flex items-start gap-3 text-sm">
                      <IconInfoCircle className="h-5 w-5 text-primary" />
                      <span>
                        {t('settings.password_alert')}
                      </span>
                    </AlertDescription>
                  </Alert>

                  {/* Sandbox Mode Toggle */}
                  <div className="flex items-center space-x-2 rounded-lg border border-warning/50 bg-warning/10 p-4">
                    <div className="flex-1 space-y-1">
                      <Label htmlFor="sandbox-mode" className="font-medium text-warning">{t('settings.sandbox_label')}</Label>
                      <p className="text-sm text-muted-foreground">
                        {t('settings.sandbox_desc')}
                      </p>
                      {lockLeagueSelection && <p className="text-xs text-muted-foreground italic">{t('settings.sandbox_oac_disabled')}</p>}
                    </div>
                    <input
                      id="sandbox-mode"
                      type="checkbox"
                      checked={settings.isSandbox || false}
                      onChange={(e) => handleSettingsChange("isSandbox", e.target.checked)}
                      disabled={lockLeagueSelection || isOac} // Disable for OAC tournaments
                      className="h-5 w-5 rounded border-warning text-warning focus:ring-warning disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>
                </div>
              )}

              {currentStep === "billing" && settings.billingInfo && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-primary/10 border border-primary/20">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/20">
                        <IconCreditCard className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{t('billing.oac_fee_title')}</p>
                        <p className="text-xs text-muted-foreground">{t('billing.oac_fee_desc')}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-primary">3 000 Ft</p>
                      <p className="text-[10px] text-muted-foreground">{t('billing.oac_fee_vat')}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>{t('billing.type_label')}</Label>
                      <div className="flex gap-4">
                        <Button
                          type="button"
                          variant={settings.billingInfo.type === 'individual' ? 'default' : 'outline'}
                          onClick={() => handleBillingChange('type', 'individual')}
                          className="flex-1"
                        >
                          {t('billing.type_individual')}
                        </Button>
                        <Button
                          type="button"
                          variant={settings.billingInfo.type === 'company' ? 'default' : 'outline'}
                          onClick={() => handleBillingChange('type', 'company')}
                          className="flex-1"
                        >
                          {t('billing.type_company')}
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        label={settings.billingInfo.type === 'company' ? t('billing.name_company_label') : t('billing.name_individual_label')}
                        placeholder={settings.billingInfo.type === 'company' ? t('billing.name_company_placeholder') : t('billing.name_individual_placeholder')}
                        value={settings.billingInfo.name}
                        onChange={(e) => handleBillingChange("name", e.target.value)}
                        required
                      />
                      <FormField
                        label={t('billing.email_label')}
                        type="email"
                        placeholder="szamla@pelda.hu"
                        value={settings.billingInfo.email}
                        onChange={(e) => handleBillingChange("email", e.target.value)}
                        required
                      />
                    </div>

                    {settings.billingInfo.type === 'company' && (
                      <FormField
                        label={t('billing.tax_id_label')}
                        placeholder="12345678-1-12"
                        value={settings.billingInfo.taxId || ''}
                        onChange={(e) => handleBillingChange("taxId", e.target.value)}
                        required
                      />
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="md:col-span-1">
                        <FormField
                          label={t('billing.zip_label')}
                          placeholder="1234"
                          value={settings.billingInfo.zip}
                          onChange={(e) => handleBillingChange("zip", e.target.value)}
                          required
                        />
                      </div>
                      <div className="md:col-span-2">
                        <FormField
                          label={t('billing.city_label')}
                          placeholder="Budapest"
                          value={settings.billingInfo.city}
                          onChange={(e) => handleBillingChange("city", e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <FormField
                      label={t('billing.address_label')}
                      placeholder="Fő utca 1."
                      value={settings.billingInfo.address}
                      onChange={(e) => handleBillingChange("address", e.target.value)}
                      required
                    />
                    <div className="flex items-center space-x-2 rounded-lg border border-border/40 bg-muted/20 p-4">
                      <div className="flex-1 space-y-1">
                        <Label htmlFor="save-billing" className="font-medium">{t('billing.save_billing_label')}</Label>
                        <p className="text-sm text-muted-foreground">
                          {t('billing.save_billing_desc')}
                        </p>
                      </div>
                      <input
                        id="save-billing"
                        type="checkbox"
                        checked={settings.saveBillingInfo || false}
                        onChange={(e) => handleSettingsChange("saveBillingInfo", e.target.checked)}
                        className="h-5 w-5 rounded border-primary text-primary focus:ring-primary"
                      />
                    </div>
                  </div>

                  <Alert className="bg-muted/30 border-dashed">
                    <AlertDescription className="text-xs text-muted-foreground">
                      {t('billing.stripe_desc')}
                    </AlertDescription>
                  </Alert>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <DialogFooter className="flex flex-col gap-2 bg-gradient-to-r from-transparent to-primary/5 px-4 md:px-6 py-3 md:py-4 sm:flex-row sm:items-center sm:justify-between shadow-[0_-4px_12px_rgba(0,0,0,0.1)]">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isSubmitting} className="md:size-default">
            {t('footer.cancel')}
          </Button>
          <div className="flex items-center gap-2">
            {error ? (
              <div className="flex items-center gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                 <span className="text-sm font-semibold text-destructive max-w-[250px] md:max-w-xs text-right leading-tight">
                   {error}
                 </span>
                 <Button onClick={() => setError("")} size="sm" variant="secondary">
                   OK
                 </Button>
              </div>
            ) : (
              <>
                {getCurrentStepIndex() > 0 && (
                  <Button variant="outline" size="sm" onClick={handleBack} disabled={isSubmitting} className="md:size-default">
                    {t('footer.back')}
                  </Button>
                )}
                {currentStep !== visibleSteps[visibleSteps.length - 1].id ? (
                  <div className="flex flex-col items-end gap-1">
                  <Button onClick={handleNext} disabled={!canProceed() || isSubmitting} size="sm" className="md:size-default gap-1">
                    {t('footer.next')}
                    <IconChevronRight size={16} />
                    
                  </Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-end gap-1">
                    <Button 
                      onClick={handleSubmit} 
                      disabled={!canProceed() || isSubmitting || (isOac && !isOacCreationEnabled)} 
                      size="sm" 
                      className={cn("md:size-default gap-1.5 shadow-lg shadow-primary/30", isOac && "bg-primary hover:bg-primary/90")}
                    >
                      {isSubmitting ? (
                        <>
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                          {t('footer.submitting')}
                        </>
                      ) : (
                        <>
                          {isOac ? <IconCreditCard size={16} /> : <IconCheck size={16} />}
                          {isOac ? t('footer.submit_oac') : t('footer.submit_normal')}
                        </>
                      )}
                    </Button>
                     {isOac && !isOacCreationEnabled && (
                      <span className="text-xs font-medium text-destructive mb-1 animate-pulse">
                        {t('footer.oac_not_available')}
                      </span>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
