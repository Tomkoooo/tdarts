export default function LiveLoading() {
  return (
    <div className="min-h-screen bg-base-100 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-base-200 rounded-2xl p-8 shadow-xl text-center">
        <div className="mb-6">
          <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-primary-content" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-base-content mb-2">
            Élő Közvetítés Betöltése
          </h1>
          <p className="text-base-content/70">
            Ellenőrizzük a funkció elérhetőségét...
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex justify-center">
            <span className="loading loading-spinner loading-lg text-primary"></span>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Tournament adatok betöltése</span>
              <span className="loading loading-spinner loading-xs"></span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Feature flag ellenőrzés</span>
              <span className="loading loading-spinner loading-xs"></span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Socket kapcsolat inicializálás</span>
              <span className="loading loading-spinner loading-xs"></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 