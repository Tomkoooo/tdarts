"use server";

import { z } from "zod";
import mongoose from "mongoose";
import { connectMongo } from "@/lib/mongoose";
import { MatchModel, PlayerModel, TournamentModel } from "@tdarts/core";
import { TournamentService, AuthorizationService } from "@tdarts/services";
import { authorizeUserResult } from "@/shared/lib/guards";
import { withTelemetry } from "@/shared/lib/withTelemetry";
import { resolveGuardAwareStatus } from "@/shared/lib/guards/result";
import { serializeForClient } from "@/shared/lib/serializeForClient";

const inputSchema = z.object({
  playerId: z.string().min(1),
  tournamentCode: z.string().min(1),
  limit: z.number().int().min(1).max(50).optional(),
});

export type StreamRecentMatch = {
  _id: string;
  date: string;
  opponentName: string;
  average: number;
  tournamentName?: string;
  won: boolean;
};

export type StreamRecentOpponent = {
  playerId: string;
  name: string;
  lastAverage?: number;
};

async function assertStreamStudioAccess(tournamentCode: string, userId: string) {
  const { clubId } = await TournamentService.getTournamentRoleContext(tournamentCode);
  if (!clubId) {
    throw new Error("Tournament is missing club reference");
  }
  const canModerate = await AuthorizationService.checkAdminOrModerator(userId, clubId);
  if (!canModerate) {
    throw new Error("Forbidden");
  }
}

export async function getStreamPlayerContextAction(
  input: z.infer<typeof inputSchema>
) {
  const run = withTelemetry(
    "stream.getPlayerContext",
    async (payload: z.infer<typeof inputSchema>) => {
      const parsed = inputSchema.parse(payload);
      const authResult = await authorizeUserResult();
      if (!authResult.ok) return authResult;

      await connectMongo();
      await assertStreamStudioAccess(parsed.tournamentCode, authResult.data.userId);

      const playerObjectId = new mongoose.Types.ObjectId(parsed.playerId);
      const limit = parsed.limit ?? 20;

      const player = await PlayerModel.findById(playerObjectId)
        .select("_id name country")
        .lean();
      if (!player) {
        return serializeForClient({ success: false, error: "Player not found" });
      }

      const matches = await MatchModel.find(
        {
          status: "finished",
          $or: [{ "player1.playerId": playerObjectId }, { "player2.playerId": playerObjectId }],
        },
        {
          _id: 1,
          tournamentRef: 1,
          winnerId: 1,
          createdAt: 1,
          player1: 1,
          player2: 1,
        }
      )
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

      const tournamentIds = Array.from(
        new Set(
          matches
            .map((m) => String(m.tournamentRef || ""))
            .filter(Boolean)
        )
      );
      const tournaments = tournamentIds.length
        ? await TournamentModel.find(
            { _id: { $in: tournamentIds.map((id) => new mongoose.Types.ObjectId(id)) } },
            { _id: 1, tournamentSettings: 1 }
          ).lean()
        : [];
      const tournamentMap = new Map(
        tournaments.map((t) => [
          String(t._id),
          String((t as { tournamentSettings?: { name?: string } }).tournamentSettings?.name || ""),
        ])
      );

      const participantIds = Array.from(
        new Set(
          matches.flatMap((m) => [
            m.player1?.playerId ? String(m.player1.playerId) : "",
            m.player2?.playerId ? String(m.player2.playerId) : "",
          ]).filter(Boolean)
        )
      );
      const participants = participantIds.length
        ? await PlayerModel.find(
            { _id: { $in: participantIds.map((id) => new mongoose.Types.ObjectId(id)) } },
            { _id: 1, name: 1 }
          ).lean()
        : [];
      const participantMap = new Map(participants.map((p) => [String(p._id), String(p.name || "")]));

      const playerId = String(player._id);
      const recentMatches: StreamRecentMatch[] = matches.map((match) => {
        const p1Id = match.player1?.playerId ? String(match.player1.playerId) : "";
        const isPlayer1 = p1Id === playerId;
        const playerData = isPlayer1 ? match.player1 : match.player2;
        const opponentData = isPlayer1 ? match.player2 : match.player1;
        const opponentId = opponentData?.playerId ? String(opponentData.playerId) : "";
        const opponentName = participantMap.get(opponentId) || "—";
        const winnerId = match.winnerId ? String(match.winnerId) : "";
        const tournamentName = tournamentMap.get(String(match.tournamentRef || "")) || undefined;

        return {
          _id: String(match._id),
          date: match.createdAt ? new Date(match.createdAt).toISOString() : new Date().toISOString(),
          opponentName,
          average: Number(playerData?.average) || 0,
          tournamentName,
          won: Boolean(winnerId && winnerId === playerId),
        };
      });

      const opponentAgg = new Map<string, StreamRecentOpponent>();
      for (const m of recentMatches) {
        const existing = [...opponentAgg.values()].find((o) => o.name === m.opponentName);
        if (!existing && m.opponentName !== "—") {
          opponentAgg.set(m.opponentName, {
            playerId: m.opponentName,
            name: m.opponentName,
            lastAverage: m.average,
          });
        }
      }
      const recentOpponents = Array.from(opponentAgg.values()).slice(0, 12);

      return serializeForClient({
        success: true,
        player: {
          _id: playerId,
          name: String(player.name || ""),
          country: (player as { country?: string }).country ?? null,
        },
        recentMatches,
        recentOpponents,
      });
    },
    {
      method: "ACTION",
      metadata: { feature: "stream", actionName: "getStreamPlayerContext" },
      resolveStatus: resolveGuardAwareStatus,
    }
  );

  return run(input);
}
