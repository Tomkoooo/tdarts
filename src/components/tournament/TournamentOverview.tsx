"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

interface TournamentOverviewProps {
  tournament: any
  userRole?: string
  onEdit?: () => void
  onRefetch?: () => void
}

const statusConfig: Record<
  string,
  {
    label: string
    badgeClass: string
  }
> = {
  pending: {
    label: "Előkészítés alatt",
    badgeClass: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  },
  "group-stage": {
    label: "Csoportkör",
    badgeClass: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  },
  knockout: {
    label: "Egyenes kiesés",
    badgeClass: "bg-primary/10 text-primary border-primary/20",
  },
  finished: {
    label: "Befejezett",
    badgeClass: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  },
}

const formatDescription = (text: string) => {
  if (!text) return []

  const parts: Array<string | JSX.Element> = []
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
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false)

  const canEdit = userRole === "admin" || userRole === "moderator"
  const descriptionText = tournament.tournamentSettings?.description || "Nincs megadva leírás."
  const shouldTruncate = descriptionText.length > 180
  const fullDescriptionNodes = useMemo(() => formatDescription(descriptionText), [descriptionText])
  const truncatedDescriptionNodes = useMemo(() => {
    if (!shouldTruncate) return fullDescriptionNodes
    const truncated = `${descriptionText.slice(0, 180)}…`
    return formatDescription(truncated)
  }, [descriptionText, fullDescriptionNodes, shouldTruncate])
  const status = tournament.tournamentSettings?.status || "pending"
  const statusMeta = statusConfig[status] || statusConfig.pending

  const details = [
    {
      icon: <IconCalendar className="h-4 w-4" />,
      label: "Kezdés",
      value: tournament.tournamentSettings?.startDate
        ? new Date(tournament.tournamentSettings.startDate).toLocaleString("hu-HU")
        : "–",
    },
    {
      icon: <IconMapPin className="h-4 w-4" />,
      label: "Helyszín",
      value: tournament.tournamentSettings?.location || tournament.clubId?.location || "–",
    },
    {
      icon: <IconUsers className="h-4 w-4" />,
      label: "Max. létszám",
      value: tournament.tournamentSettings?.maxPlayers || "–",
    },
    {
      icon: <IconCoin className="h-4 w-4" />,
      label: "Nevezési díj",
      value:
        typeof tournament.tournamentSettings?.entryFee === "number"
          ? `${tournament.tournamentSettings.entryFee.toLocaleString("hu-HU")} Ft`
          : "–",
    },
    {
      icon: <IconTarget className="h-4 w-4" />,
      label: "Kezdő pontszám",
      value: tournament.tournamentSettings?.startingScore || "–",
    },
    {
      icon: <IconId className="h-4 w-4" />,
      label: "Formátum",
      value: tournament.tournamentSettings?.format || "–",
    },
  ]

  return (
    <Card className="bg-card/90 shadow-xl backdrop-blur border-0">
      <CardHeader className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <CardTitle className="text-2xl font-semibold text-foreground">
                {tournament.tournamentSettings?.name || "Torna"}
              </CardTitle>
              <Badge variant="outline" className={statusMeta.badgeClass}>
                {statusMeta.label}
              </Badge>
            </div>
            <CardDescription className="mt-1 flex items-center gap-2 text-sm">
              <IconId className="h-4 w-4" />
              Torna kód: <span className="font-mono">{tournament.tournamentId}</span>
            </CardDescription>
          </div>

          <div className="flex flex-wrap justify-start gap-2 md:justify-end">
            <Button variant="outline" size="sm" onClick={onRefetch} className="bg-card/80 hover:bg-card shadow-[2px_2px_0px_0px_oklch(51%_0.18_16_/0.4)]">
              <IconRefresh className="mr-2 h-4 w-4" />
              Frissítés
            </Button>
            <Button asChild size="sm" className="bg-card/80 hover:bg-card shadow-[2px_2px_0px_0px_oklch(51%_0.18_16_/0.4)]">
              <Link href={`/board/${tournament.tournamentId}`} target="_blank" className="flex items-center gap-2">
                <IconTarget className="h-4 w-4" />
                Táblák
              </Link>
            </Button>
            {(status === 'group-stage' || status === 'knockout') && (
              <Button asChild variant="outline" size="sm" className="bg-card/80 hover:bg-card shadow-[2px_2px_0px_0px_oklch(51%_0.18_16_/0.4)]">
                <Link href={`/tournaments/${tournament.tournamentId}/live`} target="_blank" className="flex items-center gap-2">
                  <IconScreenShare className="h-4 w-4" /> Élő közvetítés
                </Link>
              </Button>
            )}
            {canEdit && (
              <Button variant="secondary" size="sm" onClick={onEdit}>
                <IconEdit className="mr-2 h-4 w-4" />
                Szerkesztés
              </Button>
            )}
            <Button
              asChild
              variant="outline"
              size="sm"
              className="md:hidden"
            >
              <Link href={`/tournaments/${tournament.tournamentId}#registration`} className="flex items-center gap-2">
                <IconUserPlus className="h-4 w-4" />
                Nevezés
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
              className="rounded-xl bg-muted/30 px-3 py-3 shadow-inner"
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
          <h4 className="text-sm font-semibold text-foreground">Leírás</h4>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {isDescriptionExpanded ? fullDescriptionNodes : truncatedDescriptionNodes}
          </p>
          {shouldTruncate && (
            <Button
              size="sm"
              variant="ghost"
              className="px-0"
              onClick={() => setIsDescriptionExpanded((prev) => !prev)}
            >
              {isDescriptionExpanded ? "Kevesebb" : "Bővebben"}
            </Button>
          )}
        </div>

        <Separator />

        <div>
          <h4 className="text-sm font-semibold text-foreground">Rendezői adatok</h4>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <div className="space-y-1 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Klub</p>
              {tournament.clubId?._id ? (
                <Link
                  href={`/clubs/${tournament.clubId._id}`}
                  className="font-medium text-primary hover:text-primary/80"
                >
                  {tournament.clubId?.name}
                </Link>
              ) : (
                <span>{tournament.clubId?.name || 'Ismeretlen klub'}</span>
              )}
              <p>{tournament.clubId?.location || 'Nincs megadva helyszín'}</p>
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
                  Weboldal megnyitása
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
