"use client";

import { useState, useEffect, Suspense } from "react";
import { useTranslations } from "next-intl";
import LiveMatchViewer from "@/components/tournament/LiveMatchViewer";
import LiveMatchesList from "@/components/tournament/LiveMatchesList";
import { getMatchByIdClientAction } from "@/features/tournaments/actions/tournamentRoster.action";
import { useSearchParams, useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { IconShare, IconDeviceTv, IconArrowLeft, IconLogin } from "@tabler/icons-react";
import toast from "react-hot-toast";
import { useUserContext } from "@/hooks/useUser";

type Props = {
  code: string;
};

function LiveStreamingContent({ code }: Props) {
  const t = useTranslations("Tournament.live");
  const tLive = useTranslations("Tournament.live_matches");
  const params = useParams();
  const locale = typeof params?.locale === "string" ? params.locale : "hu";
  const { user } = useUserContext();
  const searchParams = useSearchParams();
  const router = useRouter();
  const liveRedirect = `/${locale}/tournaments/${code}/live`;
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<any>(null);

  useEffect(() => {
    const matchId = searchParams.get("matchId");
    if (!matchId) {
      setSelectedMatchId(null);
      setSelectedMatch(null);
      return;
    }
    setSelectedMatchId(matchId);
    let alive = true;
    void (async () => {
      const data = await getMatchByIdClientAction({ matchId });
      if (!alive) return;
      if (data.success && data.match) {
        setSelectedMatch(data.match as any);
      }
    })();
    return () => {
      alive = false;
    };
  }, [searchParams]);

  // If user pre-selects a pending match, refresh until it flips to ongoing/finished.
  // IMPORTANT: depend only on selectedMatchId. Including selectedMatch in deps caused an
  // infinite loop: each poll() setState(newMatch) re-ran the effect and immediate poll() again.
  useEffect(() => {
    if (!selectedMatchId) return;
    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const pollOnce = async (): Promise<string | undefined> => {
      try {
        const data = await getMatchByIdClientAction({ matchId: selectedMatchId });
        if (cancelled || !data.success || !data.match) return undefined;
        const m = data.match as any;
        setSelectedMatch(m);
        return String(m?.status ?? "");
      } catch {
        return undefined;
      }
    };

    void (async () => {
      const status = await pollOnce();
      if (cancelled || status !== "pending") return;
      intervalId = setInterval(async () => {
        if (cancelled) return;
        const s = await pollOnce();
        if (cancelled) return;
        if (s !== "pending" && intervalId != null) {
          clearInterval(intervalId);
          intervalId = null;
        }
      }, 1500);
    })();

    return () => {
      cancelled = true;
      if (intervalId != null) clearInterval(intervalId);
    };
  }, [selectedMatchId]);

  const handleMatchSelect = (matchId: string, match: any) => {
    setSelectedMatchId(matchId);
    // Always refetch by id so the viewer reflects live status transitions (pending -> ongoing) reliably.
    setSelectedMatch(null);
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
        {!user?._id && (
          <Alert className="mb-4 border-primary/30 bg-primary/5">
            <IconLogin className="h-4 w-4" />
            <AlertTitle>{tLive("login_banner_title")}</AlertTitle>
            <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span>{tLive("login_banner_description")}</span>
              <Button asChild size="sm" variant="default" className="shrink-0">
                <Link href={`/auth/login?redirect=${encodeURIComponent(liveRedirect)}`}>
                  {tLive("login_banner_cta")}
                </Link>
              </Button>
            </AlertDescription>
          </Alert>
        )}
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
                key={selectedMatchId}
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
