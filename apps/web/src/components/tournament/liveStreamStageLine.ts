type StreamStageT = (key: string, values?: Record<string, string | number>) => string;

export type MatchDataForStreamStage = {
  _id: string;
  type?: string;
  round?: number;
  boardReference?: number;
  tournamentRef?: {
    tournamentSettings?: { name?: string };
    groups?: Array<{ board?: number; matches?: Array<{ _id?: string } | string> }>;
    knockout?: Array<{ round: number; matches?: unknown[] }>;
  };
};

/** Localized subtitle for stream overlay: group index or knockout round name. */
export function formatLiveStreamStageLine(
  matchData: MatchDataForStreamStage | null,
  tournamentCode: string,
  t: StreamStageT,
): string {
  if (!matchData) return tournamentCode;
  const tr = matchData.tournamentRef;
  if (matchData.type === "group") {
    const groups = Array.isArray(tr?.groups) ? tr.groups : [];
    const mid = String(matchData._id);
    for (let i = 0; i < groups.length; i++) {
      const raw = groups[i]?.matches || [];
      const hit = raw.some((id: { _id?: string } | string) => {
        const s = typeof id === "object" && id && "_id" in id ? String((id as { _id?: string })._id) : String(id);
        return s === mid;
      });
      if (hit) {
        const n = i + 1;
        const letter = String.fromCharCode(64 + n);
        return t("stream_stage_group", { number: n, letter });
      }
    }
    if (matchData.boardReference != null) {
      return t("stream_stage_group_board", { n: matchData.boardReference });
    }
    return t("type_group");
  }
  if (matchData.type === "knockout") {
    const knockout = Array.isArray(tr?.knockout) ? tr.knockout : [];
    const maxR = knockout.reduce((m, r) => Math.max(m, Number(r?.round) || 0), 0);
    const r = Number(matchData.round) || 1;
    if (maxR <= 0) return `${t("type_knockout")} · ${t("round_n", { n: r })}`;
    const fromEnd = maxR - r;
    if (fromEnd === 0) return t("stream_knockout_final");
    if (fromEnd === 1) return t("stream_knockout_semi");
    if (fromEnd === 2) return t("stream_knockout_quarter");
    const bracketPlayers = 2 ** (fromEnd + 1);
    if (bracketPlayers >= 16) return t("stream_knockout_round_of", { n: bracketPlayers });
    return t("round_n", { n: r });
  }
  return tournamentCode;
}
