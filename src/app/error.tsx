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
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <div className="max-w-2xl mx-auto text-center">
        {/* Error Icon */}
        <div className="mb-8">
          <div className="w-24 h-24 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <IconAlertTriangle className="w-12 h-12 text-red-500" />
          </div>
          <div className="w-32 h-1 bg-gradient-to-r from-red-500 to-red-700 mx-auto rounded-full"></div>
        </div>

        {/* Main Content */}
        <div className="mb-12">
          <h1 className="text-3xl font-bold text-white mb-4">
            Hiba történt
          </h1>
          <p className="text-xl text-gray-300 mb-6">
            Sajnos valami hiba történt az oldal betöltése közben.
          </p>
          <p className="text-gray-400 mb-4">
            Próbáld meg újratölteni az oldalt, vagy lépj vissza a főoldalra.
          </p>
          
          {/* Error Details (only in development) */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-6 p-4 bg-gray-800 rounded-lg text-left">
              <h3 className="text-sm font-semibold text-white mb-2">Hiba részletei (fejlesztői mód):</h3>
              <p className="text-xs text-gray-300 font-mono break-all">
                {error.message}
              </p>
              {error.digest && (
                <p className="text-xs text-gray-400 mt-2">
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
            className="flex items-center space-x-2 px-8 py-4 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all duration-200 font-semibold"
          >
            <IconRefresh className="w-5 h-5" />
            <span>Újrapróbálkozás</span>
          </button>
          
          <Link 
            href="/"
            className="flex items-center space-x-2 px-8 py-4 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-all duration-200 font-semibold"
          >
            <IconHome className="w-5 h-5" />
            <span>Főoldal</span>
          </Link>
        </div>

        {/* Additional Help */}
        <div className="p-6 bg-gray-800 rounded-2xl">
          <h3 className="text-lg font-semibold text-white mb-3">
            Mit tehetsz?
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-300">
            <div className="text-left">
              <h4 className="font-medium text-white mb-2">Azonnali megoldások:</h4>
              <ul className="space-y-1">
                <li>• Kattints az &ldquo;Újrapróbálkozás&rdquo; gombra</li>
                <li>• Frissítsd az oldalt (F5)</li>
                <li>• Töröld a böngésző cache-t</li>
              </ul>
            </div>
            <div className="text-left">
              <h4 className="font-medium text-white mb-2">Alternatív megoldások:</h4>
              <ul className="space-y-1">
                <li>• Lépj vissza a főoldalra</li>
                <li>• Próbáld másik böngészőben</li>
                <li>• Ellenőrizd az internetkapcsolatot</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Contact Info */}
        <div className="mt-8 text-xs text-gray-500">
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
