"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useStreamPlayerProfile } from "@/hooks/useStreamPlayerProfile";
import { useStreamOverlayPrefs } from "@/hooks/useStreamOverlayPrefs";
import { getStreamPlayerContextAction } from "@/features/stream/actions/getStreamPlayerContext.action";
import type {
  StreamRecentMatch,
  StreamRecentOpponent,
} from "@/features/stream/actions/getStreamPlayerContext.action";
import { openScoreOverlay } from "@/lib/stream/openScoreOverlay";
import { openBullupOverlay } from "@/lib/stream/openBullupOverlay";
import { buildBullupPlayerBlock } from "@/lib/stream/buildBullupPlayerBlock";
import { formatLiveStreamStageLine } from "@/components/tournament/liveStreamStageLine";
import { formatBoardPlayerNameMax } from "@/lib/formatBoardPlayerName";
import toast from "react-hot-toast";

type PlayerSlot = {
  id: string;
  displayName: string;
};

type StreamStudioPanelProps = {
  tournamentCode: string;
  matchId: string;
  matchData: any;
  matchState: any;
  player1: PlayerSlot;
  player2: PlayerSlot;
  isWaitingLayout: boolean;
};

function resolvePlayerId(raw: unknown): string {
  if (!raw) return "";
  if (typeof raw === "string") return raw;
  if (typeof raw === "object" && raw !== null && "_id" in raw) {
    return String((raw as { _id: unknown })._id);
  }
  return String(raw);
}

function PlayerStreamCard({
  slot,
  tournamentCode,
  labels,
  bullupLabels,
  onOpenSingleBullup,
}: {
  slot: PlayerSlot;
  tournamentCode: string;
  labels: {
    city: string;
    nickname: string;
    darts: string;
    previousMatch: string;
    previousMatchAvg: string;
    recentOpponents: string;
    opponentsNote: string;
    playerTitle: string;
    openPlayerBullup: string;
  };
  bullupLabels: Parameters<typeof buildBullupPlayerBlock>[4];
  onOpenSingleBullup: (block: ReturnType<typeof buildBullupPlayerBlock>) => void;
}) {
  const { profile, updateProfile, loaded } = useStreamPlayerProfile(slot.id);
  const [recentMatches, setRecentMatches] = useState<StreamRecentMatch[]>([]);
  const [recentOpponents, setRecentOpponents] = useState<StreamRecentOpponent[]>([]);
  const [dbCountry, setDbCountry] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!slot.id) return;
    let alive = true;
    setLoading(true);
    void (async () => {
      const res = await getStreamPlayerContextAction({
        playerId: slot.id,
        tournamentCode,
        limit: 20,
      });
      if (!alive) return;
      if (res && typeof res === "object" && "success" in res && res.success) {
        const data = res as {
          recentMatches?: StreamRecentMatch[];
          recentOpponents?: StreamRecentOpponent[];
          player?: { country?: string | null };
        };
        setRecentMatches(data.recentMatches ?? []);
        setRecentOpponents(data.recentOpponents ?? []);
        setDbCountry(data.player?.country ?? null);
      }
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [slot.id, tournamentCode]);

  const handlePreviousMatchChange = (matchId: string) => {
    const match = recentMatches.find((m) => m._id === matchId);
    updateProfile({
      previousMatchId: matchId,
      previousMatchAvg: match ? String(match.average.toFixed(2)) : profile.previousMatchAvg,
    });
  };

  const bullupBlock = useMemo(
    () =>
      buildBullupPlayerBlock(
        slot.displayName,
        profile,
        recentMatches,
        recentOpponents,
        bullupLabels,
        dbCountry
      ),
    [slot.displayName, profile, recentMatches, recentOpponents, bullupLabels, dbCountry]
  );

  if (!loaded) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-6 text-sm text-muted-foreground">...</CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{labels.playerTitle}: {slot.displayName}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor={`${slot.id}-city`}>{labels.city}</Label>
          <Input
            id={`${slot.id}-city`}
            value={profile.city ?? ""}
            onChange={(e) => updateProfile({ city: e.target.value })}
            placeholder={dbCountry ?? ""}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${slot.id}-nickname`}>{labels.nickname}</Label>
          <Input
            id={`${slot.id}-nickname`}
            value={profile.nickname ?? ""}
            onChange={(e) => updateProfile({ nickname: e.target.value })}
            placeholder={slot.displayName}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${slot.id}-darts`}>{labels.darts}</Label>
          <Input
            id={`${slot.id}-darts`}
            value={profile.dartsUsed ?? ""}
            onChange={(e) => updateProfile({ dartsUsed: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label>{labels.previousMatch}</Label>
          <Select
            value={profile.previousMatchId ?? ""}
            onValueChange={handlePreviousMatchChange}
            disabled={loading || recentMatches.length === 0}
          >
            <SelectTrigger>
              <SelectValue placeholder={loading ? "..." : labels.previousMatch} />
            </SelectTrigger>
            <SelectContent>
              {recentMatches.map((m) => (
                <SelectItem key={m._id} value={m._id}>
                  {m.opponentName} — {m.average.toFixed(2)} avg
                  {m.tournamentName ? ` (${m.tournamentName})` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${slot.id}-avg`}>{labels.previousMatchAvg}</Label>
          <Input
            id={`${slot.id}-avg`}
            value={profile.previousMatchAvg ?? ""}
            onChange={(e) => updateProfile({ previousMatchAvg: e.target.value })}
          />
        </div>
        {recentOpponents.length > 0 && (
          <div className="space-y-1">
            <Label>{labels.recentOpponents}</Label>
            <p className="text-xs text-muted-foreground flex flex-wrap gap-1">
              {recentOpponents.map((o) => (
                <span key={o.name} className="rounded bg-muted px-1.5 py-0.5">
                  {o.name}
                  {o.lastAverage != null ? ` (${o.lastAverage.toFixed(1)})` : ""}
                </span>
              ))}
            </p>
          </div>
        )}
        <div className="space-y-1.5">
          <Label htmlFor={`${slot.id}-opp-note`}>{labels.opponentsNote}</Label>
          <Input
            id={`${slot.id}-opp-note`}
            value={profile.opponentsNote ?? ""}
            onChange={(e) => updateProfile({ opponentsNote: e.target.value })}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => onOpenSingleBullup(bullupBlock)}
        >
          {labels.openPlayerBullup}
        </Button>
      </CardContent>
    </Card>
  );
}

export function StreamStudioPanel({
  tournamentCode,
  matchId,
  matchData,
  matchState,
  player1,
  player2,
  isWaitingLayout,
}: StreamStudioPanelProps) {
  const tTour = useTranslations("Tournament");
  const t = (key: string, values?: Record<string, string | number>) =>
    tTour(`live_viewer.${key}`, values);
  const { prefs, setShowAvg } = useStreamOverlayPrefs();

  const p1Profile = useStreamPlayerProfile(player1.id);
  const p2Profile = useStreamPlayerProfile(player2.id);

  const [p1Context, setP1Context] = useState<{
    matches: StreamRecentMatch[];
    opponents: StreamRecentOpponent[];
    country: string | null;
  }>({ matches: [], opponents: [], country: null });
  const [p2Context, setP2Context] = useState<{
    matches: StreamRecentMatch[];
    opponents: StreamRecentOpponent[];
    country: string | null;
  }>({ matches: [], opponents: [], country: null });

  useEffect(() => {
    if (!player1.id) return;
    void getStreamPlayerContextAction({ playerId: player1.id, tournamentCode }).then((res) => {
      if (res && typeof res === "object" && "success" in res && res.success) {
        const d = res as {
          recentMatches?: StreamRecentMatch[];
          recentOpponents?: StreamRecentOpponent[];
          player?: { country?: string | null };
        };
        setP1Context({
          matches: d.recentMatches ?? [],
          opponents: d.recentOpponents ?? [],
          country: d.player?.country ?? null,
        });
      }
    });
  }, [player1.id, tournamentCode]);

  useEffect(() => {
    if (!player2.id) return;
    void getStreamPlayerContextAction({ playerId: player2.id, tournamentCode }).then((res) => {
      if (res && typeof res === "object" && "success" in res && res.success) {
        const d = res as {
          recentMatches?: StreamRecentMatch[];
          recentOpponents?: StreamRecentOpponent[];
          player?: { country?: string | null };
        };
        setP2Context({
          matches: d.recentMatches ?? [],
          opponents: d.recentOpponents ?? [],
          country: d.player?.country ?? null,
        });
      }
    });
  }, [player2.id, tournamentCode]);

  const bullupLabels = useMemo(
    () => ({
      city: t("stream_studio_city"),
      nickname: t("stream_studio_nickname"),
      darts: t("stream_studio_darts"),
      lastMatchAvg: t("stream_studio_last_match_avg"),
      lastOpponent: t("stream_studio_last_opponent"),
      recentOpponents: t("stream_studio_recent_opponents"),
      country: t("stream_studio_country"),
    }),
    [t]
  );

  const cardLabels = useMemo(
    () => ({
      city: t("stream_studio_city"),
      nickname: t("stream_studio_nickname"),
      darts: t("stream_studio_darts"),
      previousMatch: t("stream_studio_previous_match"),
      previousMatchAvg: t("stream_studio_last_match_avg"),
      recentOpponents: t("stream_studio_recent_opponents"),
      opponentsNote: t("stream_studio_opponents_note"),
      playerTitle: t("stream_studio_player"),
      openPlayerBullup: t("stream_studio_open_player_bullup"),
    }),
    [t]
  );

  const openScore = useCallback(() => {
    const tournamentName =
      matchData?.tournamentRef?.tournamentSettings?.name?.trim() || tournamentCode;
    const stageLine = formatLiveStreamStageLine(matchData, tournamentCode, t);
    const legsToWin = Number(matchState?.legsToWin ?? matchData?.legsToWin ?? 3) || 3;
    const ok = openScoreOverlay({
      matchId,
      matchState,
      matchData,
      player1Name: formatBoardPlayerNameMax(player1.displayName),
      player2Name: formatBoardPlayerNameMax(player2.displayName),
      tournamentCode,
      tournamentName,
      stageLine,
      legsToWin,
      currentLeg: matchState?.currentLeg ?? 1,
      p1Remaining: matchState?.currentLegData?.player1Remaining ?? 501,
      p2Remaining: matchState?.currentLegData?.player2Remaining ?? 501,
      p1LegsWon: matchState?.player1LegsWon ?? 0,
      p2LegsWon: matchState?.player2LegsWon ?? 0,
      isWaitingLayout,
      showAvg: prefs.showAvg,
      labels: {
        scoringOnTdarts: t("stream_scoring_on_tdarts"),
        scoringLegTail: t("stream_scoring_leg_tail"),
        waitingHint: t("waiting_scores_hint"),
        streamUpcomingMessage: t("stream_match_starting_soon"),
      },
    });
    if (!ok) toast.error(t("stream_studio_popup_blocked"));
  }, [
    matchData,
    matchState,
    matchId,
    tournamentCode,
    player1.displayName,
    player2.displayName,
    isWaitingLayout,
    prefs.showAvg,
    t,
  ]);

  const openSingleBullup = useCallback(
    (block: ReturnType<typeof buildBullupPlayerBlock>, windowName: string) => {
      const ok = openBullupOverlay({
        windowName,
        variant: "single",
        players: [block],
        title: block.displayName,
      });
      if (!ok) toast.error(t("stream_studio_popup_blocked"));
    },
    [t]
  );

  const openMatchupBullup = useCallback(() => {
    const b1 = buildBullupPlayerBlock(
      player1.displayName,
      p1Profile.profile,
      p1Context.matches,
      p1Context.opponents,
      bullupLabels,
      p1Context.country
    );
    const b2 = buildBullupPlayerBlock(
      player2.displayName,
      p2Profile.profile,
      p2Context.matches,
      p2Context.opponents,
      bullupLabels,
      p2Context.country
    );
    const ok = openBullupOverlay({
      windowName: "tdarts-stream-bullup-matchup",
      variant: "matchup",
      players: [b1, b2],
      title: `${player1.displayName} vs ${player2.displayName}`,
    });
    if (!ok) toast.error(t("stream_studio_popup_blocked"));
  }, [
    player1,
    player2,
    p1Profile.profile,
    p2Profile.profile,
    p1Context,
    p2Context,
    bullupLabels,
    t,
  ]);

  if (!player1.id || !player2.id) {
    return null;
  }

  return (
    <div className="mt-4 space-y-4 max-w-4xl mx-auto w-full px-4 lg:px-0">
      <Card className="border-primary/20 bg-muted/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">{t("stream_studio_title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox
                checked={prefs.showAvg}
                onCheckedChange={(c) => setShowAvg(c === true)}
              />
              <span>{t("stream_show_avg")}</span>
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" onClick={openScore}>
              {t("stream_studio_open_score")}
            </Button>
            <Button type="button" size="sm" variant="secondary" onClick={openMatchupBullup}>
              {t("stream_studio_open_matchup_bullup")}
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <PlayerStreamCard
              slot={player1}
              tournamentCode={tournamentCode}
              labels={cardLabels}
              bullupLabels={bullupLabels}
              onOpenSingleBullup={(block) => openSingleBullup(block, "tdarts-stream-bullup-p1")}
            />
            <PlayerStreamCard
              slot={player2}
              tournamentCode={tournamentCode}
              labels={cardLabels}
              bullupLabels={bullupLabels}
              onOpenSingleBullup={(block) => openSingleBullup(block, "tdarts-stream-bullup-p2")}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function resolveStreamPlayerSlots(matchData: any): {
  player1: PlayerSlot;
  player2: PlayerSlot;
} {
  const p1Ref = matchData?.player1?.playerId;
  const p2Ref = matchData?.player2?.playerId;
  return {
    player1: {
      id: resolvePlayerId(p1Ref),
      displayName: String(p1Ref?.name ?? matchData?.player1?.name ?? "Player 1"),
    },
    player2: {
      id: resolvePlayerId(p2Ref),
      displayName: String(p2Ref?.name ?? matchData?.player2?.name ?? "Player 2"),
    },
  };
}
