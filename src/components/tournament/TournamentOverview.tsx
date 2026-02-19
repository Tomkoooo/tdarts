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
  IconScreenShare,
  IconRefresh,
  IconId,
  IconEdit,
  IconMail,
  IconPhone,
  IconExternalLink,
} from "@tabler/icons-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { Separator } from "@/components/ui/separator"

interface TournamentOverviewProps {
  tournament: any
  userRole?: string
  onEdit?: () => void
  onRefetch?: () => void
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

export function TournamentOverview({ tournament, userRole, onEdit, onRefetch }: TournamentOverviewProps) {
  const t = useTranslations()
  const format = useFormatter()
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false)

  const canEdit = userRole === "admin" || userRole === "moderator"
  const descriptionText = tournament.tournamentSettings?.description || t('Tournament.overview.no_description')
  const shouldTruncate = descriptionText.length > 180
  const fullDescriptionNodes = useMemo(() => formatDescription(descriptionText), [descriptionText])
  const truncatedDescriptionNodes = useMemo(() => {
    if (!shouldTruncate) return fullDescriptionNodes
    const truncated = `${descriptionText.slice(0, 180)}…`
    return formatDescription(truncated)
  }, [descriptionText, fullDescriptionNodes, shouldTruncate])
  const status = tournament.tournamentSettings?.status || "pending"

  const statusBadgeClass: Record<string, string> = {
    pending: "bg-warning/10 text-warning border-warning/20",
    "group-stage": "bg-info/10 text-info border-info/20",
    knockout: "bg-primary/10 text-primary border-primary/20",
    finished: "bg-success/10 text-success border-success/20",
  }
  const statusLabel: Record<string, string> = {
    pending: t('Tournament.overview.status.pending'),
    "group-stage": t('Tournament.overview.status.group_stage'),
    knockout: t('Tournament.overview.status.knockout'),
    finished: t('Tournament.overview.status.finished'),
  }

  const details = [
    {
      icon: <IconCalendar className="h-4 w-4" />,
      label: t('Tournament.overview.details.start'),
      value: tournament.tournamentSettings?.startDate
        ? format.dateTime(new Date(tournament.tournamentSettings.startDate), {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })
        : "–",
    },
    {
      icon: <IconMapPin className="h-4 w-4" />,
      label: t('Tournament.overview.details.location'),
      value: tournament.tournamentSettings?.location || tournament.clubId?.location || "–",
    },
    {
      icon: <IconUsers className="h-4 w-4" />,
      label: t('Tournament.overview.details.max_players'),
      value: tournament.tournamentSettings?.maxPlayers || "–",
    },
    {
      icon: <IconCoin className="h-4 w-4" />,
      label: t('Tournament.overview.details.entry_fee'),
      value:
        typeof tournament.tournamentSettings?.entryFee === "number"
          ? format.number(tournament.tournamentSettings.entryFee, {
              style: 'currency',
              currency: 'HUF',
              maximumFractionDigits: 0
            })
          : "–",
    },
    {
      icon: <IconTarget className="h-4 w-4" />,
      label: t('Tournament.overview.details.starting_score'),
      value: tournament.tournamentSettings?.startingScore || "–",
    },
    {
      icon: <IconId className="h-4 w-4" />,
      label: t('Tournament.overview.details.format'),
      value: tournament.tournamentSettings?.format || "–",
    },
  ]

  return (
    <Card className="bg-card/92 shadow-xl shadow-black/35">
      <CardHeader className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <CardTitle className="text-2xl font-semibold text-foreground">
                {tournament.tournamentSettings?.name || t('Tournament.common.default_name')}
              </CardTitle>
              <Badge variant="outline" className={statusBadgeClass[status] || "bg-warning/10 text-warning border-warning/20"}>
                {statusLabel[status] || statusLabel.pending}
              </Badge>
            </div>
            <CardDescription className="mt-1 flex items-center gap-2 text-sm">
              <IconId className="h-4 w-4" />
              {t('Tournament.overview.tournament_code')} <span className="font-mono">{tournament.tournamentId}</span>
            </CardDescription>
          </div>

          <div className="flex flex-wrap justify-start gap-2 md:justify-end">
            <Button variant="outline" size="sm" onClick={onRefetch} className="bg-card/80 hover:bg-card">
              <IconRefresh className="mr-2 h-4 w-4" />
              {t('Tournament.overview.btn_refresh')}
            </Button>
            <Button asChild size="sm" className="bg-card/80 hover:bg-card">
              <Link href={`/board/${tournament.tournamentId}`} target="_blank" className="flex items-center gap-2">
                <IconTarget className="h-4 w-4" />
                {t('Tournament.overview.btn_scoring')}
              </Link>
            </Button>
            {(status === 'group-stage' || status === 'knockout') && (
              <Button asChild variant="outline" size="sm" className="bg-card/80 hover:bg-card">
                <Link href={`/tournaments/${tournament.tournamentId}/live`} target="_blank" className="flex items-center gap-2">
                  <IconScreenShare className="h-4 w-4" /> {t('Tournament.overview.btn_live')}
                </Link>
              </Button>
            )}
            {canEdit && status !== 'finished' && (
              <Button variant="secondary" size="sm" onClick={onEdit}>
                <IconEdit className="mr-2 h-4 w-4" />
                {t('Tournament.overview.btn_edit')}
              </Button>
            )}
            <Button
              asChild
              variant="outline"
              size="sm"
              className="md:hidden"
            >
              <Link href={`/tournaments/${tournament.tournamentId}?tab=players#registration`} className="flex items-center gap-2">
                <IconUserPlus className="h-4 w-4" />
                {t('Tournament.overview.btn_register')}
              </Link>
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {details.map((detail) => (
            <div
              key={detail.label}
              className="rounded-xl bg-muted/15 px-4 py-3 shadow-inner shadow-black/10"
            >
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground/80">
                {detail.icon}
                {detail.label}
              </div>
              <div className="mt-1 text-base font-semibold text-foreground">
                {detail.value}
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-foreground">{t('Tournament.overview.description_label')}</h4>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {isDescriptionExpanded ? fullDescriptionNodes : truncatedDescriptionNodes}
          </p>
          {shouldTruncate && (
            <Button
              size="sm"
              variant="ghost"
              className="px-0 text-primary hover:text-primary/80"
              onClick={() => setIsDescriptionExpanded((prev) => !prev)}
            >
              {isDescriptionExpanded ? t('Tournament.overview.show_less') : t('Tournament.overview.show_more')}
            </Button>
          )}
        </div>

        <Separator />

        <div>
          <h4 className="text-sm font-semibold text-foreground">{t('Tournament.overview.organizer_title')}</h4>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <div className="space-y-1 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">{t('Tournament.overview.club_label')}</p>
              {tournament.clubId?._id ? (
                <Link
                  href={`/clubs/${tournament.clubId._id}`}
                  className="font-medium text-primary hover:text-primary/80"
                >
                  {tournament.clubId?.name}
                </Link>
              ) : (
                <span>{tournament.clubId?.name || t('Tournament.overview.unknown_club')}</span>
              )}
              <p>{tournament.clubId?.location || t('Tournament.overview.no_location')}</p>
            </div>
            <div className="space-y-1 text-sm text-muted-foreground">
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
                  {t('Tournament.overview.website_label')}
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
