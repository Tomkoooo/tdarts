export type StreamPlayerProfile = {
  city?: string;
  nickname?: string;
  dartsUsed?: string;
  previousMatchAvg?: string;
  previousMatchId?: string;
  opponentsNote?: string;
  updatedAt?: string;
};

export const streamPlayerProfileStorageKey = (playerId: string) =>
  `tdarts.stream.player.v1:${playerId}`;

export const defaultStreamPlayerProfile = (): StreamPlayerProfile => ({});

export function mergeStreamPlayerProfile(
  base: StreamPlayerProfile,
  patch: Partial<StreamPlayerProfile>
): StreamPlayerProfile {
  return {
    ...base,
    ...patch,
    updatedAt: patch.updatedAt ?? new Date().toISOString(),
  };
}
