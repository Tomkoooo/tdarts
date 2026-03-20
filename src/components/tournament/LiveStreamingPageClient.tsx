"use client";

import { useState, useEffect, Suspense } from "react";
import { useTranslations } from "next-intl";
import LiveMatchViewer from "@/components/tournament/LiveMatchViewer";
import LiveMatchesList from "@/components/tournament/LiveMatchesList";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { IconShare, IconDeviceTv, IconArrowLeft } from "@tabler/icons-react";
import toast from "react-hot-toast";

type Props = {
  code: string;
};

function LiveStreamingContent({ code }: Props) {
  const t = useTranslations("Tournament.live");
  const searchParams = useSearchParams();
  const router = useRouter();
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<any>(null);

  useEffect(() => {
    const matchId = searchParams.get("matchId");
    if (matchId) setSelectedMatchId(matchId);
  }, [searchParams]);

  const handleMatchSelect = (matchId: string, match: any) => {
    setSelectedMatchId(matchId);
    setSelectedMatch(match);
    const newParams = new URLSearchParams(searchParams);
    newParams.set("matchId", matchId);
    router.push(`?${newParams.toString()}`, { scroll: false });
  };

  const handleBackToMatches = () => {
    setSelectedMatchId(null);
    setSelectedMatch(null);
    const newParams = new URLSearchParams(searchParams);
    newParams.delete("matchId");
    router.push(`?${newParams.toString()}`, { scroll: false });
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success(t("link_másolva_a"));
    } catch (err) {
      toast.error(t("nem_sikerült_másolni"));
    }
  };

  const hasSelectedMatch = Boolean(selectedMatchId);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className={`border-b bg-card sticky top-0 z-10 ${hasSelectedMatch ? "hidden lg:block" : ""}`}>
        <div className="container mx-auto py-3 px-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href={`/tournaments/${code}`}
              className="text-muted-foreground hover:text-foreground transition-colors p-2 rounded-full hover:bg-muted"
            >
              <IconArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-lg font-bold flex items-center gap-2">
                <IconDeviceTv className="w-5 h-5 text-primary" />
                {t("tdarts_live")}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {selectedMatchId && (
              <Button variant="outline" size="sm" onClick={handleShare} className="gap-2">
                <IconShare className="w-4 h-4" />
                <span>{t("megosztás")}</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className={`container mx-auto ${hasSelectedMatch ? "p-0 sm:p-4 lg:p-6" : "p-4 lg:p-6"}`}>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 min-h-[calc(100vh-80px)]">
          <div className={`col-span-1 lg:col-span-4 h-full overflow-hidden ${hasSelectedMatch ? "hidden lg:block" : ""}`}>
            <LiveMatchesList
              tournamentCode={code}
              onMatchSelect={handleMatchSelect}
              selectedMatchId={selectedMatchId}
            />
          </div>
          {selectedMatchId ? (
            <div className="col-span-1 lg:col-span-8 h-full overflow-y-auto">
              <LiveMatchViewer
                matchId={selectedMatchId}
                tournamentCode={code}
                player1={selectedMatch?.player1}
                player2={selectedMatch?.player2}
                onBack={handleBackToMatches}
                onShare={handleShare}
              />
            </div>
          ) : (
            <div className="hidden lg:flex col-span-8 bg-muted/10 border-2 border-dashed border-muted rounded-xl items-center justify-center flex-col text-muted-foreground gap-4">
              <div className="w-20 h-20 rounded-full bg-muted/20 flex items-center justify-center">
                <IconDeviceTv className="w-10 h-10 opacity-40" />
              </div>
              <div className="text-center">
                <h3 className="font-semibold text-lg">{t("válassz_egy_meccset")}</h3>
                <p className="text-sm opacity-70">{t("a_bal_oldali")}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function LiveStreamingPageClient({ code }: Props) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="loading loading-spinner text-primary" />
        </div>
      }
    >
      <LiveStreamingContent code={code} />
    </Suspense>
  );
}
