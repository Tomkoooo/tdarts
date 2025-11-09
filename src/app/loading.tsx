export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        {/* Loading Spinner */}
        <div className="mb-8">
          <div className="w-16 h-16    rounded-full animate-spin mx-auto"></div>
        </div>
        
        {/* Loading Text */}
        <h2 className="text-2xl font-bold text-white mb-2">
          Betöltés...
        </h2>
        <p className="text-gray-400">
          Kérjük várj, az oldal betöltése folyamatban van.
        </p>
        
        {/* Progress Bar */}
        <div className="mt-8 w-64 mx-auto">
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div className="bg-gradient-to-r from-red-500 to-red-700 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
          </div>
        </div>
      </div>
    </div>
  );
}