"use client"
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { IconArrowLeft, IconDeviceDesktop } from "@tabler/icons-react";

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
    <div className="min-h-screen w-full bg-gradient-to-br from-background via-background/95 to-muted/40 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="bg-card/50 backdrop-blur-xl shadow-2xl shadow-black/20">
          <CardHeader>
            <div className="flex items-start justify-between mb-4">
              <Button 
                onClick={() => router.push('/')}
                variant="ghost"
                size="sm"
                className="gap-2"
              >
                <IconArrowLeft size={18} />
                Vissza
              </Button>
            </div>
            <div className="text-center space-y-4">
              <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-2xl bg-primary/10">
                <IconDeviceDesktop className="text-primary" size={32} />
              </div>
              <div>
                <CardTitle className="text-3xl font-bold tracking-tight">Tábla Csatlakozás</CardTitle>
                <CardDescription className="text-base mt-2">
                  Add meg a torna kódot és jelszót
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="tournamentCode" className="text-sm font-semibold">
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
                <Label htmlFor="password" className="text-sm font-semibold">
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
                    <div className="w-4 h-4 border-2 border-t-primary-foreground border-r-primary-foreground border-b-transparent border-l-transparent rounded-full animate-spin mr-2" />
                    Csatlakozás...
                  </>
                ) : (
                  'Csatlakozás a tornához'
                )}
              </Button>
            </form>

            <div className="pt-4 space-y-2 text-center border-t border-border/40">
              <p className="text-sm text-muted-foreground">
                Nincs torna kódod? Kérdezd meg a szervezőt!
              </p>
              <p className="text-xs text-muted-foreground/70">
                A jelszó mentésre kerül a böngésződben a könnyebb használat érdekében.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BoardPage; 