"use client"

import React, { useMemo, useState } from "react"
import { useTranslations } from "next-intl"
import { QRCodeSVG } from "qrcode.react"
import { IconPrinter, IconCopy } from "@tabler/icons-react"
import toast from "react-hot-toast"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"

interface TournamentShareModalProps {
  isOpen: boolean
  onClose: () => void
  tournamentCode: string
  tournamentName: string
}

export default function TournamentShareModal({
  isOpen,
  onClose,
  tournamentCode,
  tournamentName,
}: TournamentShareModalProps) {
  const t = useTranslations()
  const [shareType, setShareType] = useState<'public' | 'auth'>('public')

  const shareUrl = useMemo(() => {
    if (typeof window === 'undefined') return ''
    const baseUrl = window.location.origin
    return shareType === 'auth'
      ? `${baseUrl}/auth/login?redirect=${encodeURIComponent(`/tournaments/${tournamentCode}`)}`
      : `${baseUrl}/tournaments/${tournamentCode}`
  }, [shareType, tournamentCode])

  const handleCopyLink = () => {
    if (!shareUrl) return
    navigator.clipboard.writeText(shareUrl)
    toast.success(t('Tournament.share_modal.toast_copied'))
  }

  const handlePrint = () => {
    if (!shareUrl) return
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(shareUrl)}`
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>${tournamentName} - QR Kód</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 20px; margin: 0; }
            .container { max-width: 400px; margin: 0 auto; }
            .qr-code { margin: 20px 0; }
            .link { font-size: 12px; color: #555; word-break: break-all; margin-top: 20px; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>${tournamentName}</h1>
            <p>${shareType === 'auth' ? t('Tournament.share_modal.qr_label_auth') : t('Tournament.share_modal.qr_label_public')}</p>
            <div class="qr-code">
              <img src="${qrImageUrl}" width="200" height="200" alt="QR Code" />
            </div>
            <div class="link">${shareUrl}</div>
          </div>
        </body>
        </html>
      `)
      printWindow.document.close()
      printWindow.print()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="w-[95vw] sm:max-w-md max-h-[90vh] overflow-hidden flex flex-col bg-card/95 p-0 shadow-2xl shadow-black/45">
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
        <DialogHeader className="space-y-2">
          <DialogTitle>{t('Tournament.share_modal.title')}</DialogTitle>
          <DialogDescription>
            {t('Tournament.share_modal.description')}
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
              {t('Tournament.share_modal.btn_public')}
            </Button>
            <Button
              variant={shareType === 'auth' ? 'default' : 'outline'}
              size="sm"
              className="flex-1"
              onClick={() => setShareType('auth')}
            >
              {t('Tournament.share_modal.btn_auth')}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            {shareType === 'public'
              ? t('Tournament.share_modal.type_public_desc')
              : t('Tournament.share_modal.type_auth_desc')}
          </p>

          <div className="flex justify-center">
            <div className="rounded-lg border bg-white p-4 shadow-sm">
              <QRCodeSVG value={shareUrl || 'about:blank'} size={200} level="M" bgColor="#FFFFFF" fgColor="#000000" />
            </div>
          </div>

          <div className="space-y-2 text-sm">
            <p className="font-medium text-foreground">Megosztandó link</p>
            <div className="flex items-start gap-3 rounded-lg bg-muted/20 px-3 py-3 text-xs text-muted-foreground">
              <span className="flex-1 min-w-0 break-all leading-relaxed">{shareUrl}</span>
              <Badge variant="outline" className="shrink-0 whitespace-nowrap px-3 py-1 text-[11px]">
                {shareType === 'auth' ? t('Tournament.share_modal.badge_auth') : t('Tournament.share_modal.badge_public')}
              </Badge>
            </div>
          </div>
        </div>

        <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={handleCopyLink} className="w-full sm:w-auto bg-card/85 hover:bg-card">
            <IconCopy className="mr-2 h-4 w-4" /> {t('Tournament.share_modal.btn_copy')}
          </Button>
          <Button onClick={handlePrint} className="w-full sm:w-auto">
            <IconPrinter className="mr-2 h-4 w-4" /> {t('Tournament.share_modal.btn_print')}
          </Button>
        </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
