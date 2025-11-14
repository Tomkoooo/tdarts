"use client"

import React, { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { IconPrinter, IconCopy } from '@tabler/icons-react'
import toast from 'react-hot-toast'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'

interface ClubShareModalProps {
  isOpen: boolean
  onClose: () => void
  clubCode: string
  clubName: string
}

export default function ClubShareModal({ isOpen, onClose, clubCode, clubName }: ClubShareModalProps) {
  const [shareType, setShareType] = useState<'public' | 'auth'>('public')

  const generateQRCodeData = () => {
    const baseUrl = window.location.origin
    if (shareType === 'auth') {
      return `${baseUrl}/auth/login?redirect=${encodeURIComponent(`/clubs/${clubCode}?page=tournaments`)}`
    }
    return `${baseUrl}/clubs/${clubCode}?page=tournaments`
  }

  const handleCopyLink = () => {
    const link = generateQRCodeData()
    navigator.clipboard.writeText(link)
    toast.success('Link másolva!')
  }

  const handlePrint = () => {
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      const qrData = generateQRCodeData()
      const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrData)}`
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>${clubName} - QR Kód</title>
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
            <div class="subtitle">${shareType === 'auth' ? 'Bejelentkezési QR Kód' : 'Nyilvános QR Kód'}</div>
            <div class="qr-code">
              <img src="${qrImageUrl}" alt="QR kód" width="200" height="200" />
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
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="w-[95vw] sm:max-w-md overflow-hidden border border-border/40 bg-card/95 p-0 shadow-2xl shadow-black/45">
        <div className="max-h-[80vh] overflow-y-auto px-6 py-6 space-y-5">
        <DialogHeader className="space-y-2">
          <DialogTitle>Klub megosztása</DialogTitle>
          <DialogDescription>
            Oszd meg a klubod linkjét vagy QR-kódját a játékosokkal.
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
              Nyilvános
            </Button>
            <Button
              variant={shareType === 'auth' ? 'default' : 'outline'}
              size="sm"
              className="flex-1"
              onClick={() => setShareType('auth')}
            >
              Bejelentkezéssel
            </Button>
          </div>

          <p className="text-sm text-muted-foreground">
            {shareType === 'public'
              ? 'Nyilvános link – bárki megtekintheti a klubot.'
              : 'Bejelentkezési link – automatikus átirányítás bejelentkezés után.'}
          </p>

          <div className="flex justify-center">
            <div className="rounded-lg border-0 bg-white p-3 shadow-lg">
              <QRCodeSVG value={generateQRCodeData()} size={140} level="M" fgColor="#000000" bgColor="#FFFFFF" />
            </div>
          </div>

          <div className="space-y-2 text-sm">
            <p className="font-medium text-foreground">Megosztandó link</p>
            <div className="flex items-start gap-3 rounded-lg bg-muted/20 px-3 py-3 text-xs text-muted-foreground">
              <span className="flex-1 min-w-0 break-all leading-relaxed">
                {generateQRCodeData()}
              </span>
              <Badge variant="outline" className="shrink-0 whitespace-nowrap px-3 py-1 text-[11px]">
                {shareType === 'auth' ? 'Bejelentkezés szükséges' : 'Nyilvános'}
              </Badge>
            </div>
          </div>
        </div>

        <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-between">
          <Button variant="outline" className="w-full sm:w-auto bg-card/85 hover:bg-card" onClick={handleCopyLink}>
            <IconCopy className="mr-2 h-4 w-4" />
            Link másolása
          </Button>
          <Button className="w-full sm:w-auto" onClick={handlePrint}>
            <IconPrinter className="mr-2 h-4 w-4" />
            Nyomtatás
          </Button>
        </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
