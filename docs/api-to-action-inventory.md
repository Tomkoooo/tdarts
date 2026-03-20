# API To Action Migration Inventory

This inventory tracks client-side `/api/*` usage that must be migrated to server actions,
except allowlisted endpoints:

- `/api/auth/[...nextauth]`
- `/api/auth/google-callback`
- `/api/players/:id/avatar`
- `/api/media/*`
- `/api/socket/*`
- `/api/updates*`

## Migration Priority

1. User-facing tournament + club flows
2. Profile/player flows
3. Admin dashboards + CRUD surfaces
4. Secondary utilities/hooks

## User-Facing Disallowed Callsites

- `src/components/tournament/TournamentPlayers.tsx`
- `src/components/tournament/TournamentStatusChanger.tsx`
- `src/components/tournament/TournamentKnockoutBracket.tsx`
- `src/components/tournament/TournamentGroupsView.tsx`
- `src/components/tournament/PlayerMatchesModal.tsx`
- `src/components/tournament/PlayerNotificationModal.tsx`
- `src/components/tournament/TeamRegistrationModal.tsx`
- `src/components/tournament/LegsViewModal.tsx`
- `src/components/tournament/EditTournamentModal.tsx`
- `src/app/[locale]/board/[tournamentId]/page.tsx`
- `src/components/club/LeagueDetailModal.tsx`
- `src/components/club/AddPlayerModal.tsx`
- `src/components/club/PlayerSearch.tsx`
- `src/app/[locale]/clubs/[code]/page.tsx`
- `src/components/profile/ProfilePageClient.tsx`
- `src/features/statistics/hooks/usePlayerStatistics.ts`

## Admin Disallowed Callsites

- `src/app/[locale]/admin/page.tsx`
- `src/app/[locale]/admin/users/page.tsx`
- `src/app/[locale]/admin/settings/page.tsx`
- `src/app/[locale]/admin/leagues/page.tsx`
- `src/app/[locale]/admin/clubs/page.tsx`
- `src/app/[locale]/admin/tournaments/page.tsx`
- `src/app/[locale]/admin/errors/page.tsx`
- `src/app/[locale]/admin/feedback/page.tsx`
- `src/app/[locale]/admin/emails/page.tsx`
- `src/components/admin/AnnouncementTable.tsx`
- `src/components/admin/TodoManager.tsx`
- `src/components/admin/SmartTodoManager.tsx`
- `src/components/admin/GlobalTodoShortcut.tsx`
- `src/components/admin/FeedbackTable.tsx`
- `src/components/admin/AdminTicketDetail.tsx`
- `src/components/admin/LeagueManager.tsx`
- `src/components/admin/YearWrapCard.tsx`
- `src/components/admin/telemetry/TelemetryDashboardV2.tsx`

## Notes

- Some tournament endpoints currently referenced by UI do not have matching route handlers in `src/app/api`; these are mandatory migration targets.
- Avatar/media routes are intentionally allowlisted and restored in this migration wave.
