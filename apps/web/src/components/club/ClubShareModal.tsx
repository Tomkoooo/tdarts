"use client"

import React, { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { IconPrinter, IconCopy } from '@tabler/icons-react'
import toast from 'react-hot-toast'
import { AppModal } from '@/components/modal/AppModal'
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { useLocale, useTranslations } from 'next-intl'
import type { SupportedLocale } from '@/lib/seo'
import {
  buildClubLoginRedirectShareLink,
  buildClubPublicShareLink,
  buildClubSelectedTournamentsShortShareLink,
} from '@/lib/club-share-links'
import { createSelectedTournamentsShareLinkAction } from '@/features/clubs/actions/createSelectedTournamentsShareLink.action'
import { listSelectedTournamentsShareLinksAction } from '@/features/clubs/actions/listSelectedTournamentsShareLinks.action'

interface ClubShareModalProps {
  isOpen: boolean
  onClose: () => void
  clubId: string
  clubCode: string
  clubName: string
  tournaments: Array<{
    tournamentId: string
    tournamentSettings?: { name?: string; startDate?: string; status?: string }
    isDeleted?: boolean
    isSandbox?: boolean
  }>
}

export default function ClubShareModal({ isOpen, onClose, clubId, clubCode, clubName, tournaments }: ClubShareModalProps) {
  const t = useTranslations('Club.share_modal')
  const locale = useLocale() as SupportedLocale
  const [shareType, setShareType] = useState<'public' | 'auth' | 'selected'>('public')
  const [baseUrl, setBaseUrl] = useState('')
  const [selectedTournamentIds, setSelectedTournamentIds] = useState<string[]>([])
  const [selectedToken, setSelectedToken] = useState('')
  const [isGeneratingToken, setIsGeneratingToken] = useState(false)
  const [isLoadingLinks, setIsLoadingLinks] = useState(false)
  const [existingLinks, setExistingLinks] = useState<Array<{
    token: string
    tournamentIds: string[]
    createdAt: string
    expiresAt: string
  }>>([])

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      setBaseUrl(window.location.origin)
    }
  }, [])

  React.useEffect(() => {
    if (!isOpen || shareType !== 'selected') return
    let cancelled = false
    const load = async () => {
      setIsLoadingLinks(true)
      try {
        const rows = await listSelectedTournamentsShareLinksAction({ clubId })
        if (!cancelled) setExistingLinks(rows)
      } catch {
        if (!cancelled) setExistingLinks([])
      } finally {
        if (!cancelled) setIsLoadingLinks(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [isOpen, shareType, clubId])

  const generateQRCodeData = () => {
    if (!baseUrl) return ''
    if (shareType === 'selected') {
      if (!selectedToken) return ''
      return buildClubSelectedTournamentsShortShareLink(baseUrl, locale, selectedToken)
    }
    if (shareType === 'auth') {
      return buildClubLoginRedirectShareLink(baseUrl, locale, clubCode)
    }
    return buildClubPublicShareLink(baseUrl, locale, clubCode)
  }

  const handleCopyLink = () => {
    const link = generateQRCodeData()
    if (!link) return
    navigator.clipboard.writeText(link)
    toast.success(t('toast_copied'))
  }

  const availableTournaments = React.useMemo(() => {
    return [...tournaments]
      .filter((tournament) => tournament.isDeleted !== true)
      .sort((a, b) => {
        const aStatus = String(a.tournamentSettings?.status || '').trim().toLowerCase()
        const bStatus = String(b.tournamentSettings?.status || '').trim().toLowerCase()
        const aWaitingRank = aStatus === 'pending' ? 0 : 1
        const bWaitingRank = bStatus === 'pending' ? 0 : 1
        if (aWaitingRank !== bWaitingRank) return aWaitingRank - bWaitingRank
        const aDate = a.tournamentSettings?.startDate ? new Date(a.tournamentSettings.startDate).getTime() : 0
        const bDate = b.tournamentSettings?.startDate ? new Date(b.tournamentSettings.startDate).getTime() : 0
        return bDate - aDate
      })
  }, [tournaments])

  const formatTournamentDate = (value?: string) => {
    if (!value) return null
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return null
    return date.toLocaleDateString(locale)
  }

  const tournamentNameById = React.useMemo(() => {
    const map = new Map<string, string>()
    for (const tournament of availableTournaments) {
      map.set(tournament.tournamentId, tournament.tournamentSettings?.name || t('unnamed_tournament'))
    }
    return map
  }, [availableTournaments, t])

  const handleToggleTournament = (id: string) => {
    setSelectedTournamentIds((prev) => (prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id]))
  }

  const handleGenerateSelectedLink = async () => {
    if (selectedTournamentIds.length === 0) {
      toast.error(t('select_required'))
      return
    }
    setIsGeneratingToken(true)
    try {
      const result = await createSelectedTournamentsShareLinkAction({
        clubId,
        tournamentIds: selectedTournamentIds,
      })
      setSelectedToken(result.token)
      const rows = await listSelectedTournamentsShareLinksAction({ clubId })
      setExistingLinks(rows)
      toast.success(t('selected_link_ready'))
    } catch {
      toast.error(t('selected_link_error'))
    } finally {
      setIsGeneratingToken(false)
    }
  }

  const handlePrint = () => {
    const qrData = generateQRCodeData()
    if (!qrData) return
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrData)}`
      const authTitle = t('print_auth_subtitle')
      const publicTitle = t('print_public_subtitle')
      const qrAlt = t('qr_alt')
      
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>${t('print_qr_title', { name: clubName })}</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 20px; margin: 0; }
            .container { max-width: 400px; margin: 0 auto; }
            .qr-code { margin: 20px 0; }
            .title { font-size: 24px; font-weight: bold; margin-bottom: 10px; color: #333; }
            .subtitle { font-size: 16px; color: #666; margin-bottom: 20px; }
            .link { font-size: 12px; color: #999; word-break: break-all; margin-top: 20px; padding: 10px; background: #f5f5f5; border-radius: 5px; }
            @media print { body { margin: 0; } .container { max-width: none; } }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="title">${clubName}</div>
            <div class="subtitle">${shareType === 'auth' ? authTitle : publicTitle}</div>
            <div class="qr-code">
              <img src="${qrImageUrl}" alt="${qrAlt}" width="200" height="200" />
            </div>
            <div class="link">${qrData}</div>
          </div>
        </body>
        </html>
      `)
      printWindow.document.close()
      printWindow.print()
    }
  }

  return (
    <AppModal open={isOpen} onOpenChange={(open) => !open && onClose()} size="md">
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
        <DialogHeader className="space-y-2">
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>
            {t('description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="flex items-center gap-2">
            <Button
              variant={shareType === 'public' ? 'default' : 'outline'}
              size="sm"
              className="flex-1"
              onClick={() => setShareType('public')}
            >
              {t('public_tab')}
            </Button>
            <Button
              variant={shareType === 'selected' ? 'default' : 'outline'}
              size="sm"
              className="flex-1"
              onClick={() => setShareType('selected')}
            >
              {t('selected_tab')}
            </Button>
            <Button
              variant={shareType === 'auth' ? 'default' : 'outline'}
              size="sm"
              className="flex-1"
              onClick={() => setShareType('auth')}
            >
              {t('auth_tab')}
            </Button>
          </div>

          <p className="text-sm text-muted-foreground">
            {shareType === 'public'
              ? t('public_desc')
              : shareType === 'selected'
                ? t('selected_desc')
              : t('auth_desc')}
          </p>

          {shareType === 'selected' && (
            <div className="space-y-3 rounded-lg border border-border/60 bg-card/30 p-3">
              <p className="text-xs font-medium text-foreground">{t('selected_picker_label')}</p>
              <div className="max-h-40 space-y-2 overflow-auto pr-1">
                {availableTournaments.map((tournament) => (
                  <label
                    key={tournament.tournamentId}
                    className="flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 hover:bg-muted/35"
                  >
                    <input
                      type="checkbox"
                      className="mt-0.5"
                      checked={selectedTournamentIds.includes(tournament.tournamentId)}
                      onChange={() => handleToggleTournament(tournament.tournamentId)}
                    />
                    <div className="text-xs text-foreground">
                      <div>
                        {tournament.tournamentSettings?.name || t('unnamed_tournament')}
                        {formatTournamentDate(tournament.tournamentSettings?.startDate) && (
                          <span className="ml-1 italic text-muted-foreground">
                            ({formatTournamentDate(tournament.tournamentSettings?.startDate)})
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {t('status_label')}: {tournament.tournamentSettings?.status || 'pending'}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={handleGenerateSelectedLink}
                disabled={isGeneratingToken || selectedTournamentIds.length === 0}
              >
                {isGeneratingToken ? t('selected_generating') : t('selected_generate')}
              </Button>
              <div className="space-y-2 rounded-lg border border-border/50 bg-background/40 p-3">
                <p className="text-xs font-medium text-foreground">{t('existing_links_title')}</p>
                {isLoadingLinks ? (
                  <p className="text-xs text-muted-foreground">{t('existing_links_loading')}</p>
                ) : existingLinks.length === 0 ? (
                  <p className="text-xs text-muted-foreground">{t('existing_links_empty')}</p>
                ) : (
                  <div className="max-h-36 space-y-2 overflow-auto pr-1">
                    {existingLinks.map((link) => (
                      <button
                        key={link.token}
                        type="button"
                        className="w-full rounded-md border border-border/40 px-2 py-2 text-left hover:bg-muted/35"
                        onClick={() => setSelectedToken(link.token)}
                      >
                        <div className="text-[11px] font-medium text-foreground">{link.token}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {link.tournamentIds.map((id) => tournamentNameById.get(id) || id).join(', ')}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-center">
            <div className="rounded-lg border-0 bg-white p-3 shadow-lg">
              <QRCodeSVG value={generateQRCodeData() || `${clubCode}-${shareType}`} size={140} level="M" fgColor="#000000" bgColor="#FFFFFF" />
            </div>
          </div>

          <div className="space-y-2 text-sm">
            <p className="font-medium text-foreground">{t('link_label')}</p>
            <div className="flex items-start gap-3 rounded-lg bg-muted/20 px-3 py-3 text-xs text-muted-foreground">
              <span className="flex-1 min-w-0 break-all leading-relaxed">
                {generateQRCodeData()}
              </span>
              <Badge variant="outline" className="shrink-0 whitespace-nowrap px-3 py-1 text-[11px]">
                {shareType === 'auth' ? t('auth_needed_badge') : t('public_badge')}
              </Badge>
            </div>
          </div>
        </div>

        <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-between">
          <Button
            variant="outline"
            className="w-full sm:w-auto bg-card/85 hover:bg-card"
            onClick={handleCopyLink}
            disabled={!generateQRCodeData()}
          >
            <IconCopy className="mr-2 h-4 w-4" />
            {t('copy_link')}
          </Button>
          <Button className="w-full sm:w-auto" onClick={handlePrint} disabled={!generateQRCodeData()}>
            <IconPrinter className="mr-2 h-4 w-4" />
            {t('print')}
          </Button>
        </DialogFooter>
        </div>
    </AppModal>
  )
}
