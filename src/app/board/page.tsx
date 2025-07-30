"use client"
import React, { useState } from "react";
import { useRouter } from "next/navigation";

const BoardPage: React.FC = () => {
  const [tournamentCode, setTournamentCode] = useState<string>("");
  const [error, setError] = useState<string>("");
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!tournamentCode.trim()) {
      setError("Kérlek add meg a torna kódot!");
      return;
    }

    if (tournamentCode.length !== 4) {
      setError("A torna kódnak 4 karakter hosszúnak kell lennie!");
      return;
    }

    // Redirect to the tournament board page
    router.push(`/board/${tournamentCode}`);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit(e);
    }
  };

  return (
    <div className="h-screen bg-gradient-to-br from-base-200 to-base-300 flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-md">
        <div className="bg-base-100 rounded-2xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <div className="mb-4">
              <svg className="w-16 h-16 mx-auto text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-primary mb-2">Torna Csatlakozás</h1>
            <p className="text-base-content/70">Add meg a 4 karakteres torna kódot</p>
          </div>
          
          {error && (
            <div className="alert alert-error mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text font-bold">Torna Kód</span>
              </label>
              <input
                type="text"
                placeholder="Pl.: ABC1"
                className="input input-bordered input-lg w-full text-center text-2xl font-mono tracking-widest"
                value={tournamentCode}
                onChange={(e) => setTournamentCode(e.target.value.toUpperCase())}
                onKeyPress={handleKeyPress}
                maxLength={4}
                minLength={4}
                autoFocus
              />
              <label className="label">
                <span className="label-text-alt text-base-content/60">4 karakteres kód</span>
              </label>
            </div>
            
            <button
              type="submit"
              className="btn btn-primary btn-lg w-full"
              disabled={!tournamentCode.trim() || tournamentCode.length !== 4}
            >
              Csatlakozás a tornához
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-base-content/60">
              Nincs torna kódod? Kérdezd meg a szervezőt!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BoardPage; 