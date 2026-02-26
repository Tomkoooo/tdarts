"use client"
import { useTranslations } from "next-intl";

import { useEffect, useState, useCallback, useMemo } from "react"
import { useParams, useSearchParams } from "next/navigation"
import { useRouter } from "@/i18n/routing"
import { IconAdjustments, IconGripVertical, IconPlayerSkipForward, IconQrcode, IconX } from "@tabler/icons-react"
import { useRealTimeUpdates } from "@/hooks/useRealTimeUpdates"
import axios from "axios"
import QRCode from 'react-qr-code'
import Rankings180 from "@/components/tournament/tv/Rankings180"
import RankingsCheckout from "@/components/tournament/tv/RankingsCheckout"
import BoardStatus from "@/components/tournament/tv/BoardStatus"
import GroupsDisplay from "@/components/tournament/tv/GroupsDisplay"
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useTvSettingsLocal } from "@/hooks/useTvSettingsLocal";
import { useUrgentQueue } from "@/hooks/useUrgentQueue";
import { useSlideScheduler } from "@/hooks/useSlideScheduler";
import {
  buildBaseSlides,
  buildUrgentEvents,
  getBoardSummary,
  getGroupsDisplay,
  getKnockoutDisplay,
  getRankings180,
  getRankingsCheckout,
  TvBaseSlideType,
  urgentEventToSlide,
} from "@/lib/tv/slideshow";
import {
  SlideBoardStatus,
  SlideFallback,
  SlideGroups,
  SlideKnockoutBracket,
  SlideKnockoutFinal,
  SlideMilestoneFlash,
  SlideRankings180,
  SlideRankingsCheckout,
} from "@/components/tournament/tv/slides";

const LEGACY_MODE = "legacy";
const SLIDESHOW_MODE = "slideshow";

function LegacyTVLayout({
  code,
  tournament,
  qrExpanded,
  setQrExpanded,
  qrPosition,
  qrSize,
  isDragging,
  isResizing,
  handleMouseDown,
  handleResizeMouseDown,
  handleExit,
  t,
}: {
  code: string;
  tournament: any;
  qrExpanded: boolean;
  setQrExpanded: (value: boolean) => void;
  qrPosition: { x: number; y: number } | null;
  qrSize: number;
  isDragging: boolean;
  isResizing: boolean;
  handleMouseDown: (e: React.MouseEvent) => void;
  handleResizeMouseDown: (e: React.MouseEvent) => void;
  handleExit: () => void;
  t: (key: string) => string;
}) {
  const boardSectionHeight = useMemo(() => {
    if (!tournament?.boards) return 45
    const waitingBoards = tournament.boards.filter((b: any) => b.status === 'waiting')
    const boardCount = waitingBoards.length

    if (boardCount === 0) return 30
    if (boardCount <= 2) return 35
    if (boardCount <= 4) return 42
    if (boardCount <= 6) return 48
    return 50
  }, [tournament?.boards])

  const tournamentUrl = process.env.NEXT_PUBLIC_NODE_ENV === 'development'
    ? `http://localhost:3000/tournaments/${code}`
    : `https://tdarts.sironic.hu/tournaments/${code}`

  return (
    <div className="h-screen w-screen overflow-hidden bg-background text-foreground relative">
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
          <span>{t("exit")}</span>
        </button>
      </header>

      <main className="h-[95vh] p-4 flex flex-col gap-4">
        <div className="grid grid-cols-3 gap-4" style={{ height: `${boardSectionHeight}vh` }}>
          <Rankings180 tournament={tournament} />
          <RankingsCheckout tournament={tournament} />
          <BoardStatus tournament={tournament} />
        </div>

        <div className="overflow-hidden" style={{ height: `calc(95vh - ${boardSectionHeight}vh - 1rem)` }}>
          <GroupsDisplay tournament={tournament} />
        </div>
      </main>

      <div
        className="fixed z-50 select-none"
        style={{
          left: qrPosition !== null ? qrPosition.x : 'auto',
          right: qrPosition !== null ? 'auto' : '24px',
          top: qrPosition !== null ? qrPosition.y : 'auto',
          bottom: qrPosition !== null ? 'auto' : '24px',
          cursor: isDragging ? 'grabbing' : 'grab'
        }}
      >
        {qrExpanded ? (
          <div className="bg-white p-4 rounded-xl shadow-2xl border-4 border-primary relative">
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
            <QRCode value={tournamentUrl} size={qrSize} level="H" />
            <div className="text-center mt-2 text-xs font-semibold text-gray-800">
              {t("scan_to_join")}
            </div>
            <div
              onMouseDown={handleResizeMouseDown}
              className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary rounded-full cursor-nwse-resize hover:bg-primary/80 transition-colors shadow-lg flex items-center justify-center"
              style={{ touchAction: 'none' }}
            >
              <div className="w-2 h-2 border-r-2 border-b-2 border-white" />
            </div>
          </div>
        ) : (
          <button
            onClick={() => setQrExpanded(true)}
            className="bg-primary text-primary-content px-4 py-2 rounded-lg shadow-xl hover:bg-primary/90 transition-colors flex items-center gap-2"
          >
            <IconQrcode className="h-5 w-5" />
            <span className="font-semibold">{t("open_qr")}</span>
          </button>
        )}
      </div>
    </div>
  )
}

export default function TVModePage() {
  const t = useTranslations("Tournament.tv");
  const tTour = useTranslations("Tournament");
  const { code } = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const [tournament, setTournament] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [qrExpanded, setQrExpanded] = useState(true)
  const [qrPosition, setQrPosition] = useState<{ x: number; y: number } | null>(null)
  const [qrSize, setQrSize] = useState(160)
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [resizeStart, setResizeStart] = useState({ size: 160, x: 0, y: 0 })
  const [settingsOpen, setSettingsOpen] = useState(false);
  const tournamentCode = typeof code === "string" ? code : "";
  const displayMode = searchParams.get("mode") === SLIDESHOW_MODE ? SLIDESHOW_MODE : LEGACY_MODE;
  const isSlideshowMode = displayMode === SLIDESHOW_MODE;
  const { settings, setSettings, resetSettings, loaded: settingsLoaded } = useTvSettingsLocal(tournamentCode);
  const urgentQueue = useUrgentQueue({ cooldownMs: 20000, maxQueueSize: 30 });

  const rankings180 = useMemo(() => getRankings180(tournament), [tournament]);
  const rankingsCheckout = useMemo(() => getRankingsCheckout(tournament), [tournament]);
  const groupsDisplay = useMemo(() => getGroupsDisplay(tournament), [tournament]);
  const boardSummary = useMemo(() => getBoardSummary(tournament), [tournament]);
  const knockoutDisplay = useMemo(
    () => getKnockoutDisplay(tournament, settings.knockoutSplitThreshold),
    [tournament, settings.knockoutSplitThreshold]
  );
  const baseSlides = useMemo(() => buildBaseSlides(tournament, settings), [tournament, settings]);

  const consumeUrgentSlide = useCallback(() => {
    const urgent = urgentQueue.dequeue();
    if (!urgent) return undefined;
    return urgentEventToSlide(urgent, settings);
  }, [urgentQueue, settings]);

  const scheduler = useSlideScheduler({
    baseSlides,
    settings,
    enabled: isSlideshowMode && !!tournament,
    consumeUrgent: consumeUrgentSlide,
  });

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

      if (isSlideshowMode && tournament) {
        const urgentEvents = buildUrgentEvents(tournament, res.data, settings);
        const added = urgentQueue.enqueueMany(urgentEvents);
        if (added > 0 && settings.highAlertInterrupts) {
          scheduler.showUrgentNow();
        }
      }
    } catch (error) {
      console.error('Silent refresh error:', error)
    }
  }, [code, tournament, isSlideshowMode, settings, urgentQueue, scheduler])

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
        // Always refresh on these events to catch knockout rounds and other updates
        console.log('TV Mode - Triggering silent refresh')
        silentRefresh()
      }
    }
  }, [lastEvent, silentRefresh])

  const handleExit = () => {
    router.push(`/tournaments/${code}`)
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsDragging(true)
    setDragStart({
      x: e.clientX - (qrPosition?.x ?? 0),
      y: e.clientY - (qrPosition?.y ?? 0)
    })
  }

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsResizing(true)
    setResizeStart({
      size: qrSize,
      x: e.clientX,
      y: e.clientY
    })
  }

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging) {
      setQrPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      })
    }
    if (isResizing) {
      const deltaX = e.clientX - resizeStart.x
      const deltaY = e.clientY - resizeStart.y
      const delta = Math.max(deltaX, deltaY)
      const newSize = Math.max(100, Math.min(400, resizeStart.size + delta))
      setQrSize(newSize)
    }
  }, [isDragging, dragStart, isResizing, resizeStart])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
    setIsResizing(false)
  }, [])

  useEffect(() => {
    if (isDragging || isResizing) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, isResizing, handleMouseMove, handleMouseUp])

  if (loading) {
    return (
      <div className="h-screen w-screen bg-background flex items-center justify-center">
        <div className="text-foreground text-2xl">{t("loading")}</div>
      </div>
    )
  }

  if (!tournament) {
    return (
      <div className="h-screen w-screen bg-background flex items-center justify-center">
        <div className="text-foreground text-2xl">{t("tournament_not_found")}</div>
      </div>
    )
  }

  const tournamentUrl = process.env.NEXT_PUBLIC_NODE_ENV === 'development'
    ? `http://localhost:3000/tournaments/${code}`
    : `https://tdarts.sironic.hu/tournaments/${code}`

  const tournamentName = tournament.tournamentSettings?.name || "Tournament";
  const activeSlide = scheduler.activeSlide;

  const slideContent = (() => {
    switch (activeSlide.type) {
      case "rankings180":
        return (
          <SlideRankings180
            rows={rankings180}
            title={tTour("tv_slideshow.rankings_180_title")}
            emptyLabel={tTour("tv_views.rankings_180.no_data")}
          />
        );
      case "rankingsCheckout":
        return (
          <SlideRankingsCheckout
            rows={rankingsCheckout}
            title={tTour("tv_slideshow.rankings_checkout_title")}
            emptyLabel={tTour("tv_views.rankings_checkout.no_data")}
          />
        );
      case "groups":
        return (
          <SlideGroups
            groups={groupsDisplay}
            title={tTour("tv_slideshow.groups_title")}
            emptyLabel={tTour("tv_views.groups.no_groups")}
          />
        );
      case "boardStatus":
      case "boardUrgent":
        return (
          <SlideBoardStatus
            boardSummary={boardSummary}
            title={tTour("tv_slideshow.board_status_title")}
            emptyLabel={tTour("tv_views.board_status.no_boards")}
            waitingLabel={tTour("tv_slideshow.waiting_label")}
          />
        );
      case "knockoutLeft":
        return (
          <SlideKnockoutBracket
            title={tTour("tv_slideshow.knockout_title")}
            sideLabel={
              activeSlide.payload?.mode === "left"
                ? tTour("tv_slideshow.knockout_left")
                : tTour("tv_slideshow.knockout_full")
            }
            rounds={
              activeSlide.payload?.mode === "left"
                ? knockoutDisplay.leftRounds
                : knockoutDisplay.allRounds
            }
            emptyLabel={tTour("tv_slideshow.no_knockout")}
          />
        );
      case "knockoutRight":
        return (
          <SlideKnockoutBracket
            title={tTour("tv_slideshow.knockout_title")}
            sideLabel={tTour("tv_slideshow.knockout_right")}
            rounds={knockoutDisplay.rightRounds}
            emptyLabel={tTour("tv_slideshow.no_knockout")}
          />
        );
      case "knockoutFinal":
        return (
          <SlideKnockoutFinal
            title={tTour("tv_slideshow.knockout_final_title")}
            finalMatch={knockoutDisplay.finalMatch}
            emptyLabel={tTour("tv_slideshow.no_knockout")}
          />
        );
      case "milestoneFlash":
        return (
          <SlideMilestoneFlash
            title={tTour("tv_slideshow.milestone_title")}
            label={
              activeSlide.payload?.milestoneType === "checkout"
                ? tTour("tv_slideshow.new_checkout")
                : tTour("tv_slideshow.new_180")
            }
            value={
              activeSlide.payload?.milestoneType === "checkout"
                ? String(activeSlide.payload?.value || 0)
                : `+${String(activeSlide.payload?.value || 0)}`
            }
            playerName={String(activeSlide.payload?.playerName || tTour("tv_slideshow.unknown_player"))}
          />
        );
      default:
        return (
          <SlideFallback
            title={tTour("tv_slideshow.no_slide_title")}
            description={tTour("tv_slideshow.no_slide_description")}
          />
        );
    }
  })();

  if (!isSlideshowMode || !settingsLoaded) {
    return (
      <LegacyTVLayout
        code={tournamentCode}
        tournament={tournament}
        qrExpanded={qrExpanded}
        setQrExpanded={setQrExpanded}
        qrPosition={qrPosition}
        qrSize={qrSize}
        isDragging={isDragging}
        isResizing={isResizing}
        handleMouseDown={handleMouseDown}
        handleResizeMouseDown={handleResizeMouseDown}
        handleExit={handleExit}
        t={t}
      />
    );
  }

  const updateSlideEnabled = (slide: TvBaseSlideType, checked: boolean) => {
    setSettings({ enabledSlides: { ...settings.enabledSlides, [slide]: checked } });
  };

  const updateSlideDuration = (slide: TvBaseSlideType, value: string) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 3000) return;
    setSettings({
      perSlideDurationMs: {
        ...settings.perSlideDurationMs,
        [slide]: parsed,
      },
    });
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-background text-foreground relative">
      <header className="h-[8vh] px-6 flex items-center justify-between bg-muted/5 border-b border-muted/20">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">{tournamentName}</h1>
          <span className="text-sm text-muted-foreground uppercase tracking-wider">
            {activeSlide.kind === "urgent"
              ? tTour("tv_slideshow.live_priority")
              : tTour("tv_slideshow.rotation")}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => scheduler.nextSlide()}>
            <IconPlayerSkipForward className="mr-2 h-4 w-4" />
            {tTour("tv_slideshow.next_slide")}
          </Button>
          <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
            <SheetTrigger asChild>
              <Button variant="outline">
                <IconAdjustments className="mr-2 h-4 w-4" />
                {tTour("tv_slideshow.settings")}
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-md overflow-y-auto">
              <SheetHeader>
                <SheetTitle>{tTour("tv_slideshow.settings")}</SheetTitle>
              </SheetHeader>

              <div className="mt-6 space-y-5">
                <div className="space-y-2">
                  <label className="text-sm font-medium">{tTour("tv_slideshow.base_interval")}</label>
                  <Input
                    type="number"
                    min={3000}
                    value={settings.baseIntervalMs}
                    onChange={(event) => setSettings({ baseIntervalMs: Number(event.target.value || 10000) })}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">{tTour("tv_slideshow.urgent_interval")}</label>
                  <Input
                    type="number"
                    min={3000}
                    value={settings.urgentIntervalMs}
                    onChange={(event) => setSettings({ urgentIntervalMs: Number(event.target.value || 7000) })}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">{tTour("tv_slideshow.knockout_split_threshold")}</label>
                  <Input
                    type="number"
                    min={2}
                    value={settings.knockoutSplitThreshold}
                    onChange={(event) =>
                      setSettings({ knockoutSplitThreshold: Number(event.target.value || settings.knockoutSplitThreshold) })
                    }
                  />
                </div>

                <div className="space-y-3">
                  {Object.entries(settings.enabledSlides).map(([slide, enabled]) => (
                    <div key={slide} className="flex items-center justify-between rounded-lg border border-muted/20 px-3 py-2">
                      <div>
                        <div className="font-medium">{tTour(`tv_slideshow.slide_names.${slide}`)}</div>
                        <Input
                          type="number"
                          min={3000}
                          className="mt-2 h-8"
                          value={settings.perSlideDurationMs[slide as TvBaseSlideType] || settings.baseIntervalMs}
                          onChange={(event) => updateSlideDuration(slide as TvBaseSlideType, event.target.value)}
                          disabled={!enabled}
                        />
                      </div>
                      <Switch
                        checked={enabled}
                        onCheckedChange={(checked) => updateSlideEnabled(slide as TvBaseSlideType, checked)}
                      />
                    </div>
                  ))}
                </div>

                <div className="space-y-3 rounded-xl border border-muted/20 p-3">
                  <div className="flex items-center justify-between">
                    <span>{tTour("tv_slideshow.high_alert_interrupts")}</span>
                    <Switch
                      checked={settings.highAlertInterrupts}
                      onCheckedChange={(checked) => setSettings({ highAlertInterrupts: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span>{tTour("tv_slideshow.board_interrupts")}</span>
                    <Switch
                      checked={settings.boardUrgencyEnabled}
                      onCheckedChange={(checked) => setSettings({ boardUrgencyEnabled: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span>{tTour("tv_slideshow.milestone_interrupts")}</span>
                    <Switch
                      checked={settings.milestoneUrgencyEnabled}
                      onCheckedChange={(checked) => setSettings({ milestoneUrgencyEnabled: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span>{tTour("tv_slideshow.show_qr")}</span>
                    <Switch checked={settings.showQr} onCheckedChange={(checked) => setSettings({ showQr: checked })} />
                  </div>
                </div>

                <Button variant="outline" onClick={resetSettings} className="w-full">
                  {tTour("tv_slideshow.reset_defaults")}
                </Button>
              </div>
            </SheetContent>
          </Sheet>

          <Button variant="outline" onClick={handleExit}>
            <IconX className="mr-2 h-4 w-4" />
            {t("exit")}
          </Button>
        </div>
      </header>

      <main className="h-[92vh] p-4">
        {slideContent}
      </main>

      {settings.showQr ? (
        <div
          className="fixed z-50 select-none"
          style={{
            left: qrPosition !== null ? qrPosition.x : 'auto',
            right: qrPosition !== null ? 'auto' : '24px',
            top: qrPosition !== null ? qrPosition.y : 'auto',
            bottom: qrPosition !== null ? 'auto' : '24px',
            cursor: isDragging ? 'grabbing' : 'grab'
          }}
        >
          {qrExpanded ? (
            <div className="bg-white p-4 rounded-xl shadow-2xl border-4 border-primary relative">
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
              <QRCode value={tournamentUrl} size={qrSize} level="H" />
              <div className="text-center mt-2 text-xs font-semibold text-gray-800">
                {t("scan_to_join")}
              </div>
              <div
                onMouseDown={handleResizeMouseDown}
                className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary rounded-full cursor-nwse-resize hover:bg-primary/80 transition-colors shadow-lg flex items-center justify-center"
                style={{ touchAction: 'none' }}
              >
                <div className="w-2 h-2 border-r-2 border-b-2 border-white" />
              </div>
            </div>
          ) : (
            <button
              onClick={() => setQrExpanded(true)}
              className="bg-primary text-primary-content px-4 py-2 rounded-lg shadow-xl hover:bg-primary/90 transition-colors flex items-center gap-2"
            >
              <IconQrcode className="h-5 w-5" />
              <span className="font-semibold">{t("open_qr")}</span>
            </button>
          )}
        </div>
      ) : null}
    </div>
  )
}
