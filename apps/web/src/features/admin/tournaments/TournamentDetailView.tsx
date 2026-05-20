import { getTranslations } from 'next-intl/server';
import { AdminDetailShell } from '@/features/admin/detail/AdminDetailShell';
import { AdminField, AdminFieldGrid } from '@/features/admin/detail/AdminFieldGrid';
import { AdminRelationLink } from '@/features/admin/detail/AdminRelationLink';
import { formatBool, formatText } from '@/features/admin/detail/format-value';
import {
  adminGetTournamentDetailAction,
  adminGetTournamentRelationsAction,
} from '@/features/admin/tournaments/actions';
import { AdminDetailBreadcrumb } from '@/features/admin/components/AdminDetailBreadcrumb';
import { TournamentDetailEdit } from '@/features/admin/tournaments/TournamentDetailEdit';
import { TournamentRelationsPanel } from '@/features/admin/tournaments/TournamentRelationsPanel';
import type { TournamentRelationFilters } from '@/features/admin/tournaments/tournament-relation-filters';
import { notFound } from 'next/navigation';

type Props = {
  locale: string;
  tournamentId: string;
  relFilters: TournamentRelationFilters;
};

export async function TournamentDetailView({ locale, tournamentId, relFilters }: Props) {
  const t = await getTranslations('Admin');
  const [result, relResult] = await Promise.all([
    adminGetTournamentDetailAction(tournamentId),
    adminGetTournamentRelationsAction(tournamentId, {
      playerStatus: relFilters.playerStatus,
      playerQ: relFilters.playerQ || undefined,
      matchStatus: relFilters.matchStatus,
      matchType: relFilters.matchType,
      matchRound: relFilters.matchRound || undefined,
      matchBoard: relFilters.matchBoard || undefined,
    }),
  ]);
  if (!result.ok) {
    if (result.error === 'Tournament not found') notFound();
    return <p className="text-destructive p-6 text-sm">{result.error}</p>;
  }

  const { tournament } = result;
  const settings = tournament.tournamentSettings as Record<string, unknown> | undefined;
  const title = String(settings?.name ?? tournament.tournamentId ?? 'Verseny');
  const clubId = String(tournament.clubId ?? '');
  const clubName = String(tournament.clubName ?? '');

  const relations = relResult.ok
    ? relResult.relations
    : { players: [], matches: [], totalPlayers: 0, totalMatches: 0 };

  const listParams = { page: 1, limit: 20 };

  return (
    <>
      <AdminDetailBreadcrumb label={title} />
      <AdminDetailShell
        title={title}
        description={String(tournament.tournamentId ?? '')}
        backHref="/admin/tournaments"
        backLabel={t('detail.back_to_list')}
        tabs={[
          {
            id: 'identity',
            label: t('detail.tabs.identity'),
            content: (
              <>
                <AdminFieldGrid>
                  <AdminField label="Kód">
                    <span className="font-mono">{String(tournament.tournamentId ?? '')}</span>
                  </AdminField>
                  <AdminField label="Státusz">{formatText(settings?.status)}</AdminField>
                  <AdminField label="Formátum">{formatText(settings?.format)}</AdminField>
                  <AdminField label="Klub">
                    {clubId ? (
                      <AdminRelationLink
                        href={`/admin/clubs/${clubId}`}
                        label={clubName || t('detail.view_club')}
                        sublabel={clubId}
                      />
                    ) : (
                      '—'
                    )}
                  </AdminField>
                  <AdminField label="Játékosok">{String(tournament.playersCount ?? 0)}</AdminField>
                  <AdminField label="Táblák">
                    {Array.isArray(tournament.boards) ? tournament.boards.length : 0}
                  </AdminField>
                  <AdminField label="Várólista">{String(tournament.waitingListCount ?? 0)}</AdminField>
                  <AdminField label="Verified">{formatBool(Boolean(tournament.verified))}</AdminField>
                  <AdminField label="Archivált">{formatBool(Boolean(tournament.isArchived))}</AdminField>
                  <AdminField label="Sandbox">{formatBool(Boolean(tournament.isSandbox))}</AdminField>
                </AdminFieldGrid>
                <TournamentDetailEdit
                  locale={locale}
                  tournamentId={String(tournament._id)}
                  settingsValues={{
                    tournamentSettings: {
                      name: String(settings?.name ?? ''),
                      status: String(settings?.status ?? 'pending'),
                    },
                    clubId: clubId || null,
                    clubDisplayLabel: clubName || undefined,
                  }}
                  flagValues={{
                    isArchived: Boolean(tournament.isArchived),
                    isSandbox: Boolean(tournament.isSandbox),
                    isDeleted: Boolean(tournament.isDeleted),
                    verified: Boolean(tournament.verified),
                  }}
                />
              </>
            ),
          },
          {
            id: 'relations',
            label: t('detail.tabs.relations'),
            content: (
              <TournamentRelationsPanel
                players={relations.players}
                matches={relations.matches}
                totalPlayers={relations.totalPlayers}
                totalMatches={relations.totalMatches}
                filters={relFilters}
                listParams={listParams}
              />
            ),
          },
          {
            id: 'audit',
            label: t('detail.tabs.audit'),
            content: <p className="text-muted-foreground text-sm">{t('detail.audit_entity_hint')}</p>,
          },
        ]}
      />
    </>
  );
}
