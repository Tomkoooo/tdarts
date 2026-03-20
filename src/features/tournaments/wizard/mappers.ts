import type { CreateTournamentPayload } from "../actions/createTournament.action";
import type { WizardFormState } from "./schema";

export function mapWizardStateToPayload(
  state: WizardFormState,
  leagueId?: string
): CreateTournamentPayload {
  return {
    name: state.name,
    description: state.description || undefined,
    boards: state.boards.map((b) => ({
      boardNumber: b.boardNumber,
      name: b.name,
    })),
    maxPlayers: state.maxPlayers,
    format: state.format,
    startingScore: state.startingScore,
    entryFee: state.entryFee,
    tournamentPassword: state.tournamentPassword || undefined,
    location: state.location || null,
    type: state.type,
    registrationDeadline: state.registrationDeadline?.toISOString?.() ?? new Date().toISOString(),
    participationMode: state.participationMode,
    startDate: state.startDate?.toISOString?.() ?? new Date().toISOString(),
    isSandbox: state.isSandbox,
    leagueId,
    billingInfo: state.billingInfo as Record<string, unknown> | undefined,
    saveBillingInfo: state.saveBillingInfo,
  };
}
