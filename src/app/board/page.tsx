"use client"
import React, { useState } from "react";
import { useRouter } from "next/navigation";

const BoardPage: React.FC = () => {
  const [tournamentCode, setTournamentCode] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!tournamentCode.trim()) {
      setError("Kérlek add meg a torna kódot!");
      return;
    }

    if (tournamentCode.length !== 4) {
      setError("A torna kódnak 4 karakter hosszúnak kell lennie!");
      return;
    }

    if (!password.trim()) {
      setError("Kérlek add meg a jelszót!");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Validate tournament password
      const response = await fetch(`/api/tournaments/${tournamentCode}/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Hibás jelszó vagy torna kód!');
        setLoading(false);
        return;
      }

      // Save password to localStorage for this tournament
      localStorage.setItem(`tournament_password_${tournamentCode}`, password);
      
      // Redirect to board page with tournament code
      router.push(`/board/${tournamentCode}`);
    } catch (err: any) {
      setError(err.message || 'Hiba történt a csatlakozás során');
      setLoading(false);
    }
  };


  return (
    <div className="h-screen bg-gradient-to-br from-base-200 to-base-300 flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-md">
        <div className="bg-base-100 rounded-2xl p-8 shadow-2xl">
          <div className="flex justify-between items-center mb-6">
            <button 
              onClick={() => router.push('/')}
              className="btn btn-ghost btn-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Vissza
            </button>
          </div>
          
          <div className="text-center mb-8">
            <div className="mb-4">
              <svg className="w-16 h-16 mx-auto text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-primary mb-2">Tábla Csatlakozás</h1>
            <p className="text-base-content/70">Add meg a torna kódot és jelszót</p>
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
                className="input input-bordered input-lg w-full text-center text-2xl font-mono tracking-widest uppercase"
                value={tournamentCode}
                onChange={(e) => setTournamentCode(e.target.value.toUpperCase())}
                maxLength={4}
                autoFocus
              />
              <label className="label">
                <span className="label-text-alt text-base-content/60">4 karakteres kód</span>
              </label>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-bold">Jelszó</span>
              </label>
              <input
                type="password"
                placeholder="Torna jelszó"
                className="input input-bordered input-lg w-full"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <label className="label">
                <span className="label-text-alt text-base-content/60">Kérd el a szervezőtől</span>
              </label>
            </div>
            
            <button
              type="submit"
              className="btn btn-primary btn-lg w-full"
              disabled={!tournamentCode.trim() || tournamentCode.length !== 4 || !password.trim() || loading}
            >
              {loading ? (
                <>
                  <span className="loading loading-spinner"></span>
                  Csatlakozás...
                </>
              ) : (
                'Csatlakozás a tornához'
              )}
            </button>
          </form>

          <div className="mt-6 text-center space-y-2">
            <p className="text-sm text-base-content/60">
              Nincs torna kódod? Kérdezd meg a szervezőt!
            </p>
            <p className="text-xs text-base-content/50">
              A jelszó mentésre kerül a böngésződben a könnyebb használat érdekében.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BoardPage; 