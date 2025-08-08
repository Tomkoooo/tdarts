'use client';

import Link from 'next/link';
import { useEffect } from 'react';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function LiveError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error('Live page error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-base-100 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-base-200 rounded-2xl p-8 shadow-xl text-center">
        <div className="mb-6">
          <div className="w-16 h-16 bg-error rounded-full flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-error-content" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-base-content mb-2">
            Hiba Történt
          </h1>
          <p className="text-base-content/70 mb-6">
            Nem sikerült betölteni az élő követési oldalt. 
            Kérjük próbáld újra.
          </p>
        </div>

        <div className="space-y-4">
          <div className="bg-base-100 p-4 rounded-lg">
            <h3 className="font-semibold text-base-content mb-2">Lehetséges okok:</h3>
            <ul className="text-sm text-base-content/70 space-y-1 text-left">
              <li>• A torna nem létezik vagy törölve lett</li>
              <li>• Nincs jogosultságod az oldal megtekintéséhez</li>
              <li>• Hálózati kapcsolat problémák</li>
              <li>• Szerver hiba</li>
            </ul>
          </div>

          <div className="flex gap-3">
            <button 
              onClick={reset}
              className="btn btn-primary flex-1"
            >
              Újra Próbálkozás
            </button>
            <Link
              href="/tournaments"
              className="btn btn-outline flex-1"
            >
              Vissza a Tornákhoz
            </Link>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-base-300">
          <p className="text-xs text-base-content/50">
            Ha a probléma továbbra is fennáll, kérjük vedd fel a kapcsolatot az adminisztrátorral.
          </p>
        </div>
      </div>
    </div>
  );
} 