import React, { useEffect, useState } from "react";
import { IconLoader2, IconSword, IconTrophy, IconChartBar } from "@tabler/icons-react";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { getPlayerTranslations } from "@/data/translations/player";
import LegsViewModal from "@/components/tournament/LegsViewModal";

interface HeadToHeadResponse {
  playerA: { _id: string; name: string };
  playerB: { _id: string; name: string };
  summary: {
    matchesPlayed: number;
    playerAWins: number;
    playerBWins: number;
    playerAAverage: number;
    playerBAverage: number;
    playerAHighestCheckout: number;
    playerBHighestCheckout: number;
    playerAOneEighties: number;
    playerBOneEighties: number;
    playerAFirstNineAvg: number;
    playerBFirstNineAvg: number;
  };
  matches: Array<{
    _id: string;
    date: string;
    tournament: { tournamentId: string; name: string };
    playerA: { legsWon: number; average: number; firstNineAvg?: number; highestCheckout: number; oneEightiesCount: number };
    playerB: { legsWon: number; average: number; firstNineAvg?: number; highestCheckout: number; oneEightiesCount: number };
  }>;
}

interface HeadToHeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  fetchUrl: string;
}

export default function HeadToHeadModal({ isOpen, onClose, fetchUrl }: HeadToHeadModalProps) {
  const t = getPlayerTranslations(typeof navigator !== "undefined" ? navigator.language : "hu");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<HeadToHeadResponse | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [selectedMatch, setSelectedMatch] = useState<any | null>(null);
  const [showMatchModal, setShowMatchModal] = useState(false);

  useEffect(() => {
    const run = async () => {
      if (!isOpen) return;
      setLoading(true);
      setError("");
      try {
        const response = await fetch(fetchUrl);
        const payload = await response.json();
        if (!response.ok || !payload.success) {
          throw new Error(payload?.error || t.headToHeadFetchError);
        }
        setData(payload.data);
      } catch (err: any) {
        setData(null);
        setError(err?.message || t.headToHeadFetchError);
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, [isOpen, fetchUrl, reloadToken]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => (!open ? onClose() : null)}>
      <DialogContent className="w-[calc(100vw-1rem)] max-h-[90vh] max-w-3xl overflow-y-auto p-3 sm:p-6">
        <DialogHeader>
          <DialogTitle>{t.headToHeadTitle}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <IconLoader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="space-y-3">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" size="sm" onClick={() => setReloadToken((prev) => prev + 1)}>
              {t.retry}
            </Button>
          </div>
        ) : data ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-5">
              <StatBox icon={<IconSword size={14} />} label={t.headToHeadMatches} value={data.summary.matchesPlayed} />
              <StatBox icon={<IconTrophy size={14} />} label={`${data.playerA.name} ${t.headToHeadWins}`} value={data.summary.playerAWins} />
              <StatBox icon={<IconTrophy size={14} />} label={`${data.playerB.name} ${t.headToHeadWins}`} value={data.summary.playerBWins} />
              <StatBox icon={<IconChartBar size={14} />} label={`${data.playerA.name} ${t.headToHeadAverage}`} value={data.summary.playerAAverage ? data.summary.playerAAverage.toFixed(2) : "—"} />
              <StatBox icon={<IconChartBar size={14} />} label={`${data.playerB.name} ${t.headToHeadAverage}`} value={data.summary.playerBAverage ? data.summary.playerBAverage.toFixed(2) : "—"} />
              <StatBox icon={<IconChartBar size={14} />} label={`${data.playerA.name} F9`} value={data.summary.playerAFirstNineAvg ? data.summary.playerAFirstNineAvg.toFixed(2) : "—"} />
              <StatBox icon={<IconChartBar size={14} />} label={`${data.playerB.name} F9`} value={data.summary.playerBFirstNineAvg ? data.summary.playerBFirstNineAvg.toFixed(2) : "—"} />
            </div>

            <div className="space-y-2">
              {data.matches.length === 0 ? (
                <div className="rounded-lg border border-dashed border-muted/30 p-4 text-sm text-muted-foreground">
                  {t.headToHeadNoMatches}
                </div>
              ) : (
                data.matches.map((match) => (
                  <Card key={match._id} className="border-muted/20">
                    <CardContent className="space-y-2 py-3">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold">{match.tournament.name}</p>
                          <p className="text-xs text-muted-foreground">{new Date(match.date).toLocaleDateString("hu-HU")}</p>
                        </div>
                        <div className="text-left sm:text-right">
                          <p className="text-sm font-black">
                            {match.playerA.legsWon} - {match.playerB.legsWon}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {t.headToHeadAverage}: {match.playerA.average ? match.playerA.average.toFixed(1) : "—"} / {match.playerB.average ? match.playerB.average.toFixed(1) : "—"}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            F9: {typeof match.playerA.firstNineAvg === "number" ? match.playerA.firstNineAvg.toFixed(1) : "—"} / {typeof match.playerB.firstNineAvg === "number" ? match.playerB.firstNineAvg.toFixed(1) : "—"}
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[10px] text-muted-foreground">
                        <span>{t.headToHeadHighestCheckout}: {match.playerA.highestCheckout || "—"}</span>
                        <span>{t.headToHeadHighestCheckout}: {match.playerB.highestCheckout || "—"}</span>
                        <span>{t.headToHeadOneEighties}: {match.playerA.oneEightiesCount || 0}</span>
                        <span>{t.headToHeadOneEighties}: {match.playerB.oneEightiesCount || 0}</span>
                      </div>
                      <div className="flex justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedMatch({ _id: match._id });
                            setShowMatchModal(true);
                          }}
                        >
                          {t.headToHeadReview}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        ) : null}

        {showMatchModal && selectedMatch && (
          <LegsViewModal
            isOpen={showMatchModal}
            onClose={() => {
              setShowMatchModal(false);
              setSelectedMatch(null);
            }}
            match={selectedMatch}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function StatBox({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-muted/20 bg-muted/10 p-2 sm:p-3">
      <div className="mb-2 flex items-center justify-between text-muted-foreground">
        <span className="text-[10px] font-bold uppercase wrap-break-word">{label}</span>
        {icon}
      </div>
      <p className="text-base font-black sm:text-lg">{value}</p>
    </div>
  );
}
