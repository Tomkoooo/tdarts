'use client';
import { useTranslations } from "next-intl";

import React, { useState } from 'react';
import { useRouter } from '@/i18n/routing';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import { IconTrophy, IconUsers, IconCalendar } from '@tabler/icons-react';

interface Tournament {
  _id: string;
  tournamentId: string;
  tournamentSettings: {
    name: string;
    status: string;
    format: string;
    maxPlayers: number;
  };
  tournamentPlayers: any[];
  createdAt: string;
}

interface TournamentSelectionPageProps {
  tournaments: Tournament[];
  clubId: string;
}

const TournamentSelectionPage: React.FC<TournamentSelectionPageProps> = ({ tournaments }) => {
  const t = useTranslations("Board");
  const [selectedTournament, setSelectedTournament] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedTournament) {
      setError(t("kerjuk_valassz_ki_egy_mqrn"));
      return;
    }

    if (!password) {
      setError(t("kerjuk_add_meg_a_eop9"));
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/tournaments/${selectedTournament}/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (data.success) {
        router.push(`/board/${selectedTournament}`);
      } else {
        setError(data.error || 'Hibás jelszó.');
      }
    } catch (err) {

      console.log(err);


      setError(t("hiba_tortent_a_kapcsolodas_j6nr"));
    } finally {
      setLoading(false);
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Várakozik';
      case 'group-stage': return 'Csoportkör';
      case 'knockout': return 'Egyenes kiesés';
      case 'finished': return 'Befejezve';
      default: return 'Ismeretlen';
    }
  };

  const getStatusVariant = (status: string): "default" | "outline" | "secondary" | "destructive" => {
    switch (status) {
      case 'pending': return 'secondary';
      case 'group-stage': return 'default';
      case 'knockout': return 'default';
      case 'finished': return 'outline';
      default: return 'outline';
    }
  };

  const getFormatText = (format: string) => {
    switch (format) {
      case 'group': return 'Csoportkör';
      case 'knockout': return 'Egyenes kiesés';
      case 'group_knockout': return 'Csoportkör + Egyenes kiesés';
      default: return 'Ismeretlen';
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-background via-background/95 to-muted/40 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <Card className="bg-card/50 backdrop-blur-xl shadow-2xl shadow-black/20">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <IconTrophy className="text-primary" size={24} />
              </div>
              <div>
                <CardTitle className="text-2xl">{t("torna_kiválasztása")}</CardTitle>
                <CardDescription>
                  {t("több_aktív_torna")}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-3">
                <Label className="text-sm font-semibold">{t("válassz_tornát")}</Label>
                <div className="space-y-3">
                  {tournaments.map((tournament) => (
                    <button
                      key={tournament._id}
                      type="button"
                      onClick={() => setSelectedTournament(tournament.tournamentId)}
                      className={cn(
                        "w-full text-left p-4 rounded-xl transition-all",
                        "bg-muted/20 hover:bg-muted/40",
                        selectedTournament === tournament.tournamentId && "ring-2 ring-primary bg-primary/10"
                      )}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-3">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-lg">{tournament.tournamentSettings.name}</h3>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Badge variant={getStatusVariant(tournament.tournamentSettings.status)}>
                              {getStatusText(tournament.tournamentSettings.status)}
                            </Badge>
                            <Badge variant="outline">
                              {getFormatText(tournament.tournamentSettings.format)}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1.5">
                              <IconUsers size={16} />
                              <span>
                                {tournament.tournamentPlayers.length}/{tournament.tournamentSettings.maxPlayers} {t("játékos")}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <IconCalendar size={16} />
                              <span>
                                {new Date(tournament.createdAt).toLocaleDateString('hu-HU')}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className={cn(
                          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all",
                          selectedTournament === tournament.tournamentId
                            ? "border-primary bg-primary"
                            : "border-muted-foreground/40"
                        )}>
                          {selectedTournament === tournament.tournamentId && (
                            <div className="h-2.5 w-2.5 rounded-full bg-primary-foreground" />
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-semibold">
                  {t("torna_jelszó_52")}</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder={t("add_meg_a_11")}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={loading || !selectedTournament || !password}
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-t-primary-foreground border-r-primary-foreground border-b-transparent border-l-transparent rounded-full animate-spin mr-2" />
                    {t("kapcsolódás")}</>
                ) : (
                  'Csatlakozás a tornához'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TournamentSelectionPage;
