'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { IconHome, IconRefresh, IconAlertTriangle } from '@tabler/icons-react';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    // Log the error to an error reporting service
    console.error('Global error caught:', error);
  }, [error, isClient]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-2xl mx-auto text-center">
        {/* Error Icon */}
        <div className="mb-8">
          <div className="w-24 h-24 bg-destructive/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <IconAlertTriangle size={48} className="text-destructive" />
          </div>
          <div className="w-32 h-1 bg-gradient-to-r from-destructive to-accent mx-auto rounded-full"></div>
        </div>

        {/* Main Content */}
        <div className="mb-12">
          <h1 className="text-3xl font-bold text-foreground mb-4">
            Hiba történt
          </h1>
          <p className="text-xl text-muted-foreground mb-6">
            Sajnos valami hiba történt az oldal betöltése közben.
          </p>
          <p className="text-muted-foreground mb-4">
            Próbáld meg újratölteni az oldalt, vagy lépj vissza a főoldalra.
          </p>
          
          {/* Error Details (only in development) */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-6 p-4 bg-card/60 rounded-lg text-left border border-destructive/20">
              <h3 className="text-sm font-semibold text-foreground mb-2">Hiba részletei (fejlesztői mód):</h3>
              <p className="text-xs text-muted-foreground font-mono break-all">
                {error.message}
              </p>
              {error.digest && (
                <p className="text-xs text-muted-foreground mt-2">
                  Error ID: {error.digest}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
          <button
            onClick={reset}
            className="flex items-center space-x-2 px-8 py-4 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all duration-200 font-semibold shadow-lg shadow-primary/30"
          >
            <IconRefresh size={20} />
            <span>Újrapróbálkozás</span>
          </button>
          
          <Link 
            href="/"
            className="flex items-center space-x-2 px-8 py-4 bg-card text-foreground rounded-lg hover:bg-accent transition-all duration-200 font-semibold border border-primary/20"
          >
            <IconHome size={20} />
            <span>Főoldal</span>
          </Link>
        </div>

        {/* Additional Help */}
        <div className="p-6 bg-card/60 rounded-2xl border border-primary/10">
          <h3 className="text-lg font-semibold text-foreground mb-3">
            Mit tehetsz?
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
            <div className="text-left">
              <h4 className="font-medium text-foreground mb-2">Azonnali megoldások:</h4>
              <ul className="space-y-1">
                <li>• Kattints az &ldquo;Újrapróbálkozás&rdquo; gombra</li>
                <li>• Frissítsd az oldalt (F5)</li>
                <li>• Töröld a böngésző cache-t</li>
              </ul>
            </div>
            <div className="text-left">
              <h4 className="font-medium text-foreground mb-2">Alternatív megoldások:</h4>
              <ul className="space-y-1">
                <li>• Lépj vissza a főoldalra</li>
                <li>• Próbáld másik böngészőben</li>
                <li>• Ellenőrizd az internetkapcsolatot</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Contact Info */}
        <div className="mt-8 text-xs text-muted-foreground">
          <p>
            Ha a probléma továbbra is fennáll, kérjük vedd fel a kapcsolatot a fejlesztőkkel.
          </p>
          {error.digest && (
            <p className="mt-1">
              Hibajelentés azonosító: {error.digest}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
