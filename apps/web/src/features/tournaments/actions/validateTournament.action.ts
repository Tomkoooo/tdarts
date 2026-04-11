"use server";

import { TournamentService } from '@tdarts/services';
import { z } from "zod";
import { BadRequestError } from "@/middleware/errorHandle";
import { withTelemetry } from "@/shared/lib/withTelemetry";

const validateInputSchema = z.object({
  tournamentCode: z.string().length(4),
  password: z.string().min(1),
});

export type ValidateTournamentInput = {
  tournamentCode: string;
  password: string;
};

export type ValidateTournamentResult =
  | { success: true }
  | { success: false; error: string };

export async function validateTournamentAction(
  input: ValidateTournamentInput
): Promise<ValidateTournamentResult> {
  const run = withTelemetry(
    "tournaments.validateTournament",
    async (rawPayload: ValidateTournamentInput) => {
      const parsed = validateInputSchema.safeParse(rawPayload);
      if (!parsed.success) {
        throw new BadRequestError(
          parsed.error.issues[0]?.message || "Invalid payload"
        );
      }
      const { tournamentCode, password } = parsed.data;

      const valid = await TournamentService.validateTournamentByPassword(
        tournamentCode,
        password
      );

      if (!valid) {
        return { success: false as const, error: "Invalid password or tournament code" };
      }

      return { success: true as const };
    },
    {
      method: "ACTION",
      metadata: {
        feature: "tournaments",
        actionName: "validateTournament",
      },
    }
  );

  return run(input) as Promise<ValidateTournamentResult>;
}
