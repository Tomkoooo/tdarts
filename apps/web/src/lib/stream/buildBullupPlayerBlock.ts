import type { StreamBullupPlayerBlock } from "@/components/tournament/streamBullupPopupDocument";
import type { StreamPlayerProfile } from "@/lib/stream/streamPlayerProfile";
import type { StreamRecentMatch, StreamRecentOpponent } from "@/features/stream/actions/getStreamPlayerContext.action";

export type BullupLabels = {
  city: string;
  nickname: string;
  darts: string;
  lastMatchAvg: string;
  lastOpponent: string;
  recentOpponents: string;
  country: string;
};

export function buildBullupPlayerBlock(
  displayName: string,
  profile: StreamPlayerProfile,
  recentMatches: StreamRecentMatch[],
  recentOpponents: StreamRecentOpponent[],
  labels: BullupLabels,
  dbCountry?: string | null
): StreamBullupPlayerBlock {
  const selectedMatch = profile.previousMatchId
    ? recentMatches.find((m) => m._id === profile.previousMatchId)
    : undefined;

  const lastOpponent =
    selectedMatch?.opponentName ||
    (recentMatches[0]?.opponentName && recentMatches[0].opponentName !== "—"
      ? recentMatches[0].opponentName
      : "");

  const lastAvg =
    profile.previousMatchAvg?.trim() ||
    (selectedMatch ? String(selectedMatch.average.toFixed(2)) : "") ||
    (recentMatches[0] ? String(recentMatches[0].average.toFixed(2)) : "");

  const opponentsLine =
    profile.opponentsNote?.trim() ||
    recentOpponents
      .map((o) => o.name)
      .filter(Boolean)
      .slice(0, 6)
      .join(", ");

  const city = profile.city?.trim() || "";
  const country = dbCountry?.trim() || "";
  const location = [city, country].filter(Boolean).join(", ");

  return {
    displayName: profile.nickname?.trim() || displayName,
    rows: [
      { label: labels.city, value: location || city },
      { label: labels.nickname, value: profile.nickname?.trim() || displayName },
      { label: labels.darts, value: profile.dartsUsed?.trim() || "" },
      { label: labels.lastMatchAvg, value: lastAvg },
      { label: labels.lastOpponent, value: lastOpponent },
      { label: labels.recentOpponents, value: opponentsLine },
    ].filter((r) => r.label),
  };
}
