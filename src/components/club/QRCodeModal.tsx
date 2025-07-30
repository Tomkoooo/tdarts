import React, { useRef } from 'react';
import QRCode from 'react-qr-code';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  clubId: string;
  boardNumber: number;
  boardName?: string;
}

export default function QRCodeModal({ isOpen, onClose, clubId, boardNumber, boardName }: QRCodeModalProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const qrUrl = `https://tdarts.sironic.hu/board/redirect/${clubId}`;
  const displayName = boardName || `Tábla #${boardNumber}`;

  const handlePrint = () => {
    if (printRef.current) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        // Get the QR code SVG from the current component
        const qrCodeElement = printRef.current.querySelector('svg');
        const qrCodeSVG = qrCodeElement ? qrCodeElement.outerHTML : '';
        
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>${displayName} - QR Kód</title>
              <style>
                body {
                  font-family: Arial, sans-serif;
                  margin: 0;
                  padding: 20px;
                  text-align: center;
                }
                .print-container {
                  max-width: 400px;
                  margin: 0 auto;
                  padding: 20px;
                  border: 2px solid #000;
                  border-radius: 10px;
                }
                .board-name {
                  font-size: 24px;
                  font-weight: bold;
                  margin-bottom: 20px;
                  color: #333;
                }
                .qr-code {
                  margin: 20px 0;
                }
                .qr-code svg {
                  width: 200px;
                  height: 200px;
                }
                .instructions {
                  font-size: 14px;
                  color: #666;
                  margin-top: 20px;
                }
                @media print {
                  body { margin: 0; }
                  .print-container { border: none; }
                }
              </style>
            </head>
            <body>
              <div class="print-container">
                <div class="board-name">${displayName}</div>
                <div class="qr-code">
                  ${qrCodeSVG}
                </div>
                <div class="instructions">
                  <p>Scanneld be a QR kódot a táblához való csatlakozáshoz</p>
                  <p>Vagy látogass el: ${qrUrl}</p>
                </div>
              </div>
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-base-100 rounded-xl p-6 shadow-xl w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold">QR Kód - {displayName}</h3>
          <button
            onClick={onClose}
            className="btn btn-ghost btn-sm btn-circle"
          >
            ✕
          </button>
        </div>
        
        <div ref={printRef} className="text-center">
          <div className="mb-4">
            <h4 className="font-semibold text-lg mb-2">{displayName}</h4>
            <div className="bg-white p-4 rounded-lg inline-block">
              <QRCode
                value={qrUrl}
                size={200}
                level="M"
                fgColor="#000000"
                bgColor="#FFFFFF"
              />
            </div>
          </div>
          
          <div className="text-sm text-base-content/70 mb-4">
            <p>Scanneld be a QR kódot a táblához való csatlakozáshoz</p>
            <p className="mt-1">Vagy látogass el:</p>
            <p className="text-xs break-all mt-1">{qrUrl}</p>
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <button
            onClick={handlePrint}
            className="btn btn-primary btn-sm flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Nyomtatás
          </button>
          <button
            onClick={onClose}
            className="btn btn-ghost btn-sm"
          >
            Bezárás
          </button>
        </div>
      </div>
    </div>
  );
} 