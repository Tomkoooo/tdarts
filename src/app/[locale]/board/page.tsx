import { useTranslations } from "next-intl";

"use client"
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { IconArrowLeft, IconDeviceDesktop, IconPlayerPlay } from "@tabler/icons-react";
import LocalMatchGame from "@/components/board/LocalMatchGame";
import Link from "next/link";

const BoardPage: React.FC = () => {
    const t = useTranslations("Auto");
  const [tournamentCode, setTournamentCode] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [showLocalMatchSetup, setShowLocalMatchSetup] = useState<boolean>(false);
  const [localMatchLegsToWin, setLocalMatchLegsToWin] = useState<number>(3);
  const [localMatchStartingScore, setLocalMatchStartingScore] = useState<number>(501);
  const [localMatchActive, setLocalMatchActive] = useState<boolean>(false);
  const [localMatchId, setLocalMatchId] = useState<string>("");
  const [isOnline, setIsOnline] = React.useState(true);
  const router = useRouter();

  React.useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);
  
  const startingScoreOptions = [170, 201, 301, 401, 501, 601, 701];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOnline) return;
    
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

  const handleStartLocalMatch = () => {
    const matchId = `local_${Date.now()}`;
    setLocalMatchId(matchId);
    setLocalMatchActive(true);
    setShowLocalMatchSetup(false);
  };

  const handleRematch = () => {
    const matchId = `local_${Date.now()}`;
    setLocalMatchId(matchId);
    // Keep the same settings, just start a new match
    setLocalMatchActive(true);
  };


  if (localMatchActive) {
    return (
      <LocalMatchGame
        key={localMatchId}
        legsToWin={localMatchLegsToWin}
        startingScore={localMatchStartingScore}
        onBack={() => setLocalMatchActive(false)}
        onRematch={handleRematch}
      />
    );
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-background via-background/95 to-muted/40 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="bg-card/50 backdrop-blur-xl shadow-2xl shadow-black/20">
          <CardHeader>
            <div className="flex items-start justify-between mb-4">
              <Link 
                href="/"
                className="gap-2 flex items-center"
              >
                <IconArrowLeft size={18} />
                {t("vissza")}</Link>
            </div>
            <div className="text-center space-y-4">
              <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-2xl bg-primary/10">
                <IconDeviceDesktop className="text-primary" size={32} />
              </div>
              <div>
                <CardTitle className="text-3xl font-bold tracking-tight">{t("tábla_csatlakozás")}</CardTitle>
                <CardDescription className="text-base mt-2">
                  {t("add_meg_a_85")}</CardDescription>
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
                  {t("torna_kód")}</Label>
                <Input
                  id="tournamentCode"
                  type="text"
                  placeholder={t("pl_abc")}
                  className="text-center text-2xl font-mono tracking-widest uppercase h-14"
                  value={tournamentCode}
                  onChange={(e) => setTournamentCode(e.target.value.toUpperCase())}
                  maxLength={4}
                  autoFocus
                  disabled={!isOnline}
                />
                <p className="text-xs text-muted-foreground">{t("karakteres_kód")}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-semibold">
                  {t("jelszó")}</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder={t("torna_jelszó_72")}
                  className="h-14"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={!isOnline}
                />
                <p className="text-xs text-muted-foreground">{t("kérd_el_a")}</p>
              </div>
              
              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={!tournamentCode.trim() || tournamentCode.length !== 4 || !password.trim() || loading || !isOnline}
              >
                {!isOnline ? (
                  'Offline mód'
                ) : loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-t-primary-foreground border-r-primary-foreground border-b-transparent border-l-transparent rounded-full animate-spin mr-2" />
                    {t("csatlakozás")}</>
                ) : (
                  'Csatlakozás a tornához'
                )}
              </Button>
            </form>

            <div className="pt-4 space-y-4 border-t border-border/40">
              <div className="text-center">
                <Button
                  onClick={() => setShowLocalMatchSetup(true)}
                  variant="outline"
                  size="lg"
                  className="w-full gap-2"
                >
                  <IconPlayerPlay size={20} />
                  {t("helyi_meccs_indítása")}</Button>
              </div>
              
              <div className="space-y-2 text-center">
              <p className="text-sm text-muted-foreground">
                {t("nincs_torna_kódod")}</p>
              <p className="text-xs text-muted-foreground/70">
                {t("a_jelszó_mentésre")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Local Match Setup Dialog */}
      <Dialog open={showLocalMatchSetup} onOpenChange={setShowLocalMatchSetup}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("helyi_meccs_beállítása")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="legsToWin" className="text-sm font-medium mb-2 block">
                {t("nyert_legek_száma")}</Label>
              <select 
                id="legsToWin"
                onChange={(e) => setLocalMatchLegsToWin(parseInt(e.target.value))} 
                value={localMatchLegsToWin} 
                className="select select-bordered w-full"
              >
                {Array.from({ length: 20 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>{i + 1}</option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground mt-1">{t("best_of")}{localMatchLegsToWin * 2 - 1}</p>
            </div>
            <div>
              <Label htmlFor="startingScore" className="text-sm font-medium mb-2 block">
                {t("kezdő_pontszám")}</Label>
              <select 
                id="startingScore"
                onChange={(e) => setLocalMatchStartingScore(parseInt(e.target.value))} 
                value={localMatchStartingScore} 
                className="select select-bordered w-full"
              >
                {startingScoreOptions.map((score) => (
                  <option key={score} value={score}>{score}</option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground mt-1">{t("ebből_a_pontszámból")}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                {t("játékosok_39")}<span className="font-semibold">1</span> és <span className="font-semibold">2</span>
              </p>
              <p className="text-xs text-muted-foreground">
                {t("a_játékos_mindig")}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowLocalMatchSetup(false)}>
                {t("mégse")}</Button>
              <Button className="flex-1" onClick={handleStartLocalMatch}>
                {t("meccs_indítása")}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BoardPage; 