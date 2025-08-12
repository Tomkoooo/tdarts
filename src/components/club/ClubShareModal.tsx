"use client";
import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { IconX, IconPrinter, IconCopy } from '@tabler/icons-react';
import toast from 'react-hot-toast';

interface ClubShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  clubCode: string;
  clubName: string;
}

export default function ClubShareModal({ isOpen, onClose, clubCode, clubName }: ClubShareModalProps) {
  const [shareType, setShareType] = useState<'public' | 'auth'>('public');



  if (!isOpen) return null;

  const generateQRCodeData = () => {
    const baseUrl = window.location.origin;
    if (shareType === 'auth') {
      return `${baseUrl}/auth/login?redirect=${encodeURIComponent(`/clubs/${clubCode}?page=tournaments`)}`;
    } else {
      return `${baseUrl}/clubs/${clubCode}?page=tournaments`;
    }
  };

  const handleCopyLink = () => {
    const link = generateQRCodeData();
    navigator.clipboard.writeText(link);
    toast.success('Link másolva!');
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const qrData = generateQRCodeData();
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>${clubName} - QR Kód</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              text-align: center; 
              padding: 20px;
              margin: 0;
            }
            .container {
              max-width: 400px;
              margin: 0 auto;
            }
            .qr-code {
              margin: 20px 0;
            }
            .title {
              font-size: 24px;
              font-weight: bold;
              margin-bottom: 10px;
              color: #333;
            }
            .subtitle {
              font-size: 16px;
              color: #666;
              margin-bottom: 20px;
            }
            .link {
              font-size: 12px;
              color: #999;
              word-break: break-all;
              margin-top: 20px;
              padding: 10px;
              background: #f5f5f5;
              border-radius: 5px;
            }
            @media print {
              body { margin: 0; }
              .container { max-width: none; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="title">${clubName}</div>
            <div class="subtitle">
              ${shareType === 'auth' ? 'Bejelentkezési QR Kód' : 'Nyilvános QR Kód'}
            </div>
            <div class="qr-code">
              <div style="width: 200px; height: 200px; background: #f0f0f0; display: flex; align-items: center; justify-content: center; margin: 0 auto;">
                <div style="font-size: 12px; color: #666; text-align: center;">
                  QR Kód<br/>
                  (${qrData.length} karakter)
                </div>
              </div>
            </div>
            <div class="link">${qrData}</div>
          </div>
        </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-base-200 rounded-xl p-6 shadow-xl w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold">Klub megosztása</h3>
          <button
            onClick={onClose}
            className="btn btn-ghost btn-sm btn-circle"
          >
            <IconX className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-4">
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setShareType('public')}
              className={`btn btn-sm flex-1 ${shareType === 'public' ? 'btn-primary' : 'btn-outline'}`}
            >
              Nyilvános
            </button>
            <button
              onClick={() => setShareType('auth')}
              className={`btn btn-sm flex-1 ${shareType === 'auth' ? 'btn-primary' : 'btn-outline'}`}
            >
              Bejelentkezéssel
            </button>
          </div>
          
          <div className="text-sm text-base-content/70 mb-4">
            {shareType === 'public' 
              ? 'Nyilvános link - bárki megtekintheti a klubot'
              : 'Bejelentkezési link - automatikus átirányítás bejelentkezés után'
            }
          </div>
        </div>

        <div className="flex justify-center mb-4">
          <div className="bg-white p-4 rounded-lg">
            <QRCodeSVG 
              value={generateQRCodeData()} 
              size={200}
              level="M"
              fgColor="#000000"
              bgColor="#FFFFFF"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleCopyLink}
            className="btn btn-outline btn-sm flex-1 flex items-center gap-2"
          >
            <IconCopy className="w-4 h-4" />
            Link másolása
          </button>
          <button
            onClick={handlePrint}
            className="btn btn-primary btn-sm flex-1 flex items-center gap-2"
          >
            <IconPrinter className="w-4 h-4" />
            Nyomtatás
          </button>
        </div>
      </div>
    </div>
  );
}
