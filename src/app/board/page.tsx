"use client"
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card } from "@/components/ui/Card";
import { IconArrowLeft, IconCheck } from "@tabler/icons-react";

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
    <div className="h-screen bg-gradient-to-br from-muted/20 to-background flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-md">
        <Card elevation="elevated" className="p-8">
          <div className="flex justify-between items-center mb-6">
            <Button 
              onClick={() => router.push('/')}
              variant="ghost"
              size="sm"
            >
              <IconArrowLeft className="h-5 w-5 mr-1" />
              Vissza
            </Button>
          </div>
          
          <div className="text-center mb-8">
            <div className="mb-4">
              <div className="w-16 h-16 mx-auto flex items-center justify-center rounded-full bg-primary/10">
                <IconCheck className="w-8 h-8 text-primary" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-primary mb-2">Tábla Csatlakozás</h1>
            <p className="text-muted-foreground">Add meg a torna kódot és jelszót</p>
          </div>
          
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="tournamentCode" className="font-bold">
                Torna Kód
              </Label>
              <Input
                id="tournamentCode"
                type="text"
                placeholder="Pl.: ABC1"
                className="text-center text-2xl font-mono tracking-widest uppercase h-14"
                value={tournamentCode}
                onChange={(e) => setTournamentCode(e.target.value.toUpperCase())}
                maxLength={4}
                autoFocus
              />
              <p className="text-xs text-muted-foreground">4 karakteres kód</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="font-bold">
                Jelszó
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Torna jelszó"
                className="h-14"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Kérd el a szervezőtől</p>
            </div>
            
            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={!tournamentCode.trim() || tournamentCode.length !== 4 || !password.trim() || loading}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-t-primary border-r-primary border-b-transparent border-l-transparent rounded-full animate-spin mr-2" />
                  Csatlakozás...
                </>
              ) : (
                'Csatlakozás a tornához'
              )}
            </Button>
          </form>

          <div className="mt-6 text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              Nincs torna kódod? Kérdezd meg a szervezőt!
            </p>
            <p className="text-xs text-muted-foreground/70">
              A jelszó mentésre kerül a böngésződben a könnyebb használat érdekében.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default BoardPage; 