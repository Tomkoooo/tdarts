"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { useTranslations, useFormatter } from "next-intl"
import {
  IconCalendar,
  IconMapPin,
  IconUsers,
  IconCoin,
  IconTarget,
  IconUserPlus,
  IconId,
  IconMail,
  IconPhone,
  IconExternalLink,
} from "@tabler/icons-react"
import { Card, CardContent, CardHeader } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Separator } from "@/components/ui/separator"
import { getUserTimeZone } from "@/lib/date-time"
import { formatTournamentEntryFee } from "@/lib/format-entry-fee"
import ScoreBadge from "@/components/player/ScoreBadge"

interface TournamentOverviewProps {
  tournament: any
  userRole?: string
  userPlayerStatus?: 'applied' | 'checked-in' | 'none'
  isLoggedIn?: boolean
}



const formatDescription = (text: string) => {
  if (!text) return []

  const parts: Array<string | React.ReactElement> = []
  const regex = /((?:https?:\/\/|www\.)[^\s]+)/g
  let lastIndex = 0
  let match

  while ((match = regex.exec(text)) !== null) {
    const [url] = match
    const start = match.index

    if (start > lastIndex) {
      parts.push(text.slice(lastIndex, start))
    }

    const href = url.startsWith("http") ? url : `http://${url}`
    parts.push(
      <Link
        key={`${href}-${start}`}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-primary hover:text-primary/80"
      >
        {url}
      </Link>
    )

    lastIndex = regex.lastIndex
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  return parts
}

const roundToNearest5 = (value: number) => Math.round(value / 5) * 5

export function TournamentOverview({
  tournament,
  userRole,
  userPlayerStatus = "none",
  isLoggedIn = false,
}: TournamentOverviewProps) {
  const tTour = useTranslations("Tournament");
  const format = useFormatter()
  const timeZone = getUserTimeZone()
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false)

  const descriptionText = tournament.tournamentSettings?.description || tTour('overview.no_description')
  const shouldTruncate = descriptionText.length > 180
  const fullDescriptionNodes = useMemo(() => formatDescription(descriptionText), [descriptionText])
  const truncatedDescriptionNodes = useMemo(() => {
    if (!shouldTruncate) return fullDescriptionNodes
    const truncated = `${descriptionText.slice(0, 180)}…`
    return formatDescription(truncated)
  }, [descriptionText, fullDescriptionNodes, shouldTruncate])
  const status = tournament.tournamentSettings?.status || "pending"
  const now = useMemo(() => new Date(), [])
  const registrationDeadline = tournament?.tournamentSettings?.registrationDeadline
  const startDate = tournament?.tournamentSettings?.startDate
  const isPending = status === "pending"
  const registrationOpen = useMemo(() => {
    if (!isPending) return false
    if (registrationDeadline) return now < new Date(registrationDeadline)
    if (startDate) return now < new Date(startDate)
    return true
  }, [isPending, now, registrationDeadline, startDate])
  const canShowRegistrationCta = registrationOpen && userPlayerStatus === "none"
  const registrationTarget = `/tournaments/${tournament.tournamentId}?tab=players&autoJoin=1`
  const loginRedirectTarget = `/auth/login?redirect=${encodeURIComponent(registrationTarget)}`
  const clubCompetitionAvgBand = tournament?.clubCompetitionAvgBand
  const expectedMin = typeof clubCompetitionAvgBand?.minAvg === "number" ? roundToNearest5(clubCompetitionAvgBand.minAvg) : null
  const expectedMax = typeof clubCompetitionAvgBand?.maxAvg === "number" ? roundToNearest5(clubCompetitionAvgBand.maxAvg) : null
  const expectedMid =
    expectedMin !== null && expectedMax !== null
      ? (expectedMin + expectedMax) / 2
      : null
  const currentTournamentAvg = typeof tournament?.currentTournamentAvg === "number"
    ? Number(tournament.currentTournamentAvg.toFixed(2))
    : null
  const showCurrentTournamentAvg = status === "finished" && currentTournamentAvg !== null

  const details = [
    {
      icon: <IconCalendar className="h-4 w-4" />,
      label: tTour('overview.details.start'),
      value: tournament.tournamentSettings?.startDate
        ? format.dateTime(new Date(tournament.tournamentSettings.startDate), {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            timeZone
          })
        : "–",
    },
    {
      icon: <IconMapPin className="h-4 w-4" />,
      label: tTour('overview.details.location'),
      value: tournament.tournamentSettings?.location || tournament.clubId?.location || "–",
    },
    {
      icon: <IconUsers className="h-4 w-4" />,
      label: tTour('overview.details.max_players'),
      value: tournament.tournamentSettings?.maxPlayers || "–",
    },
    {
      icon: <IconCoin className="h-4 w-4" />,
      label: tTour('overview.details.entry_fee'),
      value:
        typeof tournament.tournamentSettings?.entryFee === "number"
          ? formatTournamentEntryFee(
              format.number,
              tournament.tournamentSettings.entryFee,
              tournament.tournamentSettings.entryFeeCurrency
            )
          : "–",
    },
    {
      icon: <IconTarget className="h-4 w-4" />,
      label: tTour('overview.details.starting_score'),
      value: tournament.tournamentSettings?.startingScore || "–",
    },
    {
      icon: <IconId className="h-4 w-4" />,
      label: tTour('overview.details.format'),
      value: tournament.tournamentSettings?.format || "–",
    },
  ]

  return (
    <Card className="overflow-hidden border-border/60 bg-linear-to-br from-card/95 via-card/82 to-card/70 shadow-[0_14px_34px_rgba(0,0,0,0.28)] pt-3">
     

      <CardContent className="space-y-5 pt-0">
        {canShowRegistrationCta ? (
          <div className="rounded-xl border border-primary/40 bg-primary/10 p-3">
            <p className="text-sm font-semibold text-foreground">Nevezés nyitva</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Jelentkezz most egy kattintással. A nevezes utan automatikusan a jatekosok listajaban jelensz meg.
            </p>
            <Button asChild size="sm" className="mt-2 gap-2">
              <Link
                href={isLoggedIn ? registrationTarget : loginRedirectTarget}
                className="flex items-center gap-2"
              >
                <IconUserPlus className="h-4 w-4" />
                {tTour('overview.btn_register')}
              </Link>
            </Button>
          </div>
        ) : null}

        <div className="grid gap-2.5 sm:grid-cols-2">
          {details.slice(0, 4).map((detail) => (
            <div
              key={detail.label}
              className="rounded-lg border border-border/50 bg-muted/20 px-3 py-2.5"
            >
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {detail.icon}
                {detail.label}
              </div>
              <div className="mt-1 text-sm font-semibold text-foreground md:text-base">
                {detail.value}
              </div>
            </div>
          ))}
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {details.slice(4).map((detail) => (
            <div key={detail.label} className="rounded-lg border border-border/40 bg-card/35 px-3 py-2 text-sm">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {detail.icon}
                {detail.label}
              </div>
              <div className="mt-1 font-semibold text-foreground">{detail.value}</div>
            </div>
          ))}
        </div>

        {clubCompetitionAvgBand ? (
          <div className="rounded-xl border border-border/50 bg-muted/15 p-3">
            <h4 className="text-sm font-semibold text-foreground">{tTour('card.stats.statistics')}</h4>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">{tTour('card.stats.expected_avg')}</span>
              <ScoreBadge score={Math.max(expectedMid ?? 10, 10)} label={`${expectedMin}-${expectedMax}`} />
              {showCurrentTournamentAvg ? (
                <>
                  <span className="text-xs text-muted-foreground">|</span>
                  <span className="text-xs text-muted-foreground">{tTour('card.stats.current_avg')}</span>
                  <ScoreBadge score={Math.max(currentTournamentAvg ?? 10, 10)} label={currentTournamentAvg?.toFixed(2)} />
                </>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="rounded-xl border border-border/50 bg-muted/15 p-3">
          <h4 className="text-sm font-semibold text-foreground">{tTour('overview.description_label')}</h4>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {isDescriptionExpanded ? fullDescriptionNodes : truncatedDescriptionNodes}
          </p>
          {shouldTruncate && (
            <Button
              size="sm"
              variant="ghost"
              className="mt-1 h-auto px-0 text-primary hover:text-primary/80"
              onClick={() => setIsDescriptionExpanded((prev) => !prev)}
            >
              {isDescriptionExpanded ? tTour('overview.show_less') : tTour('overview.show_more')}
            </Button>
          )}
        </div>

        <Separator />

        <div className="rounded-xl border border-border/50 bg-muted/15 p-3">
          <h4 className="text-sm font-semibold text-foreground">{tTour('overview.organizer_title')}</h4>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <div className="rounded-lg border border-border/50 bg-card/35 p-3 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">{tTour('overview.club_label')}</p>
              {tournament.clubId?._id ? (
                <Link
                  href={`/clubs/${tournament.clubId._id}`}
                  className="mt-1 block font-medium text-primary hover:text-primary/80"
                >
                  {tournament.clubId?.name}
                </Link>
              ) : (
                <span className="mt-1 block">{tournament.clubId?.name || tTour('overview.unknown_club')}</span>
              )}
              <p className="mt-1">{tournament.clubId?.location || tTour('overview.no_location')}</p>
            </div>
            <div className="space-y-2 rounded-lg border border-border/50 bg-card/35 p-3 text-sm text-muted-foreground">
              {tournament.clubId?.contact?.email && (
                <a
                  href={`mailto:${tournament.clubId.contact.email}`}
                  className="flex items-center gap-2 font-medium text-primary hover:text-primary/80"
                >
                  <IconMail className="h-4 w-4" />
                  {tournament.clubId.contact.email}
                </a>
              )}
              {tournament.clubId?.contact?.phone && (
                <a
                  href={`tel:${tournament.clubId.contact.phone}`}
                  className="flex items-center gap-2 font-medium text-primary hover:text-primary/80"
                >
                  <IconPhone className="h-4 w-4" />
                  {tournament.clubId.contact.phone}
                </a>
              )}
              {tournament.clubId?.contact?.website && (
                <Link
                  href={tournament.clubId.contact.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 font-medium text-primary hover:text-primary/80"
                >
                  <IconExternalLink className="h-4 w-4" />
                  {tTour('overview.website_label')}
                </Link>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default TournamentOverview
