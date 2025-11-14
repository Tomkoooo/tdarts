import React, { useRef } from 'react'
import QRCode from 'react-qr-code'
import { Button } from '@/components/ui/Button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface QRCodeModalProps {
  isOpen: boolean
  onClose: () => void
  clubId: string
  boardNumber: number
  boardName?: string
}

export default function QRCodeModal({ isOpen, onClose, clubId, boardNumber, boardName }: QRCodeModalProps) {
  const printRef = useRef<HTMLDivElement>(null)

  const qrUrl = `https://tdarts.sironic.hu/board/redirect/${clubId}`
  const displayName = boardName || `Tábla #${boardNumber}`

  const handlePrint = () => {
    if (printRef.current) {
      const printWindow = window.open('', '_blank')
      if (printWindow) {
        const qrCodeElement = printRef.current.querySelector('svg')
        const qrCodeSVG = qrCodeElement ? qrCodeElement.outerHTML : ''

        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>${displayName} - QR Kód</title>
              <style>
                body { font-family: Arial, sans-serif; margin: 0; padding: 20px; text-align: center; }
                .print-container { max-width: 400px; margin: 0 auto; padding: 20px; border: 2px solid #000; border-radius: 12px; }
                .board-name { font-size: 24px; font-weight: bold; margin-bottom: 16px; color: #222; }
                .qr-code { margin: 20px 0; }
                .qr-code svg { width: 220px; height: 220px; }
                .instructions { font-size: 14px; color: #666; margin-top: 20px; }
                @media print { body { margin: 0; } .print-container { border: none; } }
              </style>
            </head>
            <body>
              <div class="print-container">
                <div class="board-name">${displayName}</div>
                <div class="qr-code">
                  ${qrCodeSVG}
                </div>
                <div class="instructions">
                  <p>Scanneld be a QR kódot a táblához való csatlakozáshoz.</p>
                  <p>Vagy látogass el: ${qrUrl}</p>
                </div>
              </div>
            </body>
          </html>
        `)
        printWindow.document.close()
        printWindow.print()
      }
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>QR kód – {displayName}</DialogTitle>
          <DialogDescription>
            Nyomtasd ki vagy jelenítsd meg a táblához tartozó QR kódot a gyors csatlakozáshoz.
          </DialogDescription>
        </DialogHeader>

        <div ref={printRef} className="space-y-4 text-center">
          <div className="space-y-2">
            <h4 className="text-lg font-semibold text-foreground">{displayName}</h4>
            <div className="inline-flex rounded-lg border bg-white p-4">
              <QRCode value={qrUrl} size={200} level="M" fgColor="#000000" bgColor="#FFFFFF" />
            </div>
          </div>
          <div className="text-sm text-muted-foreground space-y-1">
            <p>Scanneld be a QR kódot a táblához való csatlakozáshoz.</p>
            <p className="text-xs break-all">{qrUrl}</p>
          </div>
        </div>

        <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <Button variant="ghost" onClick={onClose} className="w-full sm:w-auto">
            Bezárás
          </Button>
          <Button onClick={handlePrint} className="w-full sm:w-auto">
            Nyomtatás
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 