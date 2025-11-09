import Link from 'next/link';

export default function LiveNotFound() {
  return (
    <div className="min-h-screen bg-base-100 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-base-200 rounded-2xl p-8 shadow-xl text-center">
        <div className="mb-6">
          <div className="w-16 h-16 bg-warning rounded-full flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-warning-content" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.47-.881-6.08-2.33" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-base-content mb-2">
            Élő Közvetítés Nem Található
          </h1>
          <p className="text-base-content/70 mb-6">
            A keresett élő közvetítési oldal nem létezik vagy nem elérhető.
          </p>
        </div>

        <div className="space-y-4">
          <div className="bg-base-100 p-4 rounded-lg">
            <h3 className="font-semibold text-base-content mb-2">Lehetséges okok:</h3>
            <ul className="text-sm text-base-content/70 space-y-1 text-left">
              <li>• A torna nem létezik</li>
              <li>• A torna törölve lett</li>
              <li>• Nincs jogosultságod az oldal megtekintéséhez</li>
              <li>• Hibás URL</li>
            </ul>
          </div>

          <div className="flex gap-3">
            <Link 
              href="/tournaments"
              className="btn btn-primary flex-1"
            >
              Vissza a Tornákhoz
            </Link>
            <Link 
              href="/search"
              className="btn btn-outline flex-1"
            >
              Tornák Keresése
            </Link>
          </div>
        </div>

        <div className="mt-6 pt-6">
          <p className="text-xs text-base-content/50">
            Ha úgy gondolod, hogy ez hiba, kérjük vedd fel a kapcsolatot az adminisztrátorral.
          </p>
        </div>
      </div>
    </div>
  );
} 