/**
 * Tournament read-flow policy:
 * - Live data should use server actions (no direct /api/tournaments fetch in client code).
 * - Invoice download remains route-based because file downloads are browser navigation/stream flows.
 */
export const TOURNAMENT_READ_FLOW_POLICY = {
  liveMatches: 'server-action',
  invoiceDownload: 'api-route',
} as const;

export function buildTournamentInvoiceDownloadUrl(tournamentId: string): string {
  return `/api/tournaments/${tournamentId}/invoice`;
}

