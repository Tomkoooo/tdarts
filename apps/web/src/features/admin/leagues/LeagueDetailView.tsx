import { getTranslations } from 'next-intl/server';
import { AdminDetailShell } from '@/features/admin/detail/AdminDetailShell';
import { AdminField, AdminFieldGrid } from '@/features/admin/detail/AdminFieldGrid';
import { AdminRelationLink } from '@/features/admin/detail/AdminRelationLink';
import { AdminRelationTable } from '@/features/admin/detail/AdminRelationTable';
import { formatBool, formatText } from '@/features/admin/detail/format-value';
import { formatAdminDate } from '@/features/admin/list/format';
import { adminGetLeagueDetailAction } from '@/features/admin/leagues/actions';
import { notFound } from 'next/navigation';

type Props = {
  leagueId: string;
};

export async function LeagueDetailView({ leagueId }: Props) {
  const t = await getTranslations('Admin');
  const result = await adminGetLeagueDetailAction(leagueId);
  if (!result.ok) {
    if (result.error === 'League not found') notFound();
    return <p className="text-destructive p-6 text-sm">{result.error}</p>;
  }

  const { league } = result;

  return (
    <AdminDetailShell
      title={league.name}
      description={league.clubName}
      backHref="/admin/leagues"
      backLabel={t('detail.back_to_list')}
      tabs={[
        {
          id: 'identity',
          label: t('detail.tabs.identity'),
          content: (
            <AdminFieldGrid>
              <AdminField label="Klub">
                <AdminRelationLink
                  href={`/admin/clubs/${league.clubId}`}
                  label={league.clubName}
                />
              </AdminField>
              <AdminField label="Létrehozta">
                <AdminRelationLink
                  href={`/admin/users/${league.createdById}`}
                  label={league.createdByEmail}
                />
              </AdminField>
              <AdminField label="Pontrendszer">{league.pointSystemType}</AdminField>
              <AdminField label="Aktív">{formatBool(league.isActive)}</AdminField>
              <AdminField label="Verified">{formatBool(league.verified)}</AdminField>
              <AdminField label="Kezdés">{formatAdminDate(league.startDate)}</AdminField>
              <AdminField label="Vége">{formatAdminDate(league.endDate)}</AdminField>
              <AdminField label="Leírás">
                <span className="line-clamp-4">{formatText(league.description)}</span>
              </AdminField>
            </AdminFieldGrid>
          ),
        },
        {
          id: 'relations',
          label: t('detail.tabs.relations'),
          content: (
            <div className="space-y-8">
              <section>
                <h3 className="mb-3 text-sm font-semibold">{t('detail.league_tournaments')}</h3>
                <AdminRelationTable
                  rows={league.attachedTournaments}
                  emptyLabel={t('detail.relations_empty')}
                  columns={[
                    {
                      header: 'Verseny',
                      cell: (row) => (
                        <AdminRelationLink
                          href={`/admin/tournaments/${row.mongoId}`}
                          label={row.name}
                          sublabel={row.tournamentCode}
                        />
                      ),
                    },
                    { header: 'Státusz', cell: (row) => row.status },
                  ]}
                />
              </section>
              <section>
                <h3 className="mb-3 text-sm font-semibold">{t('detail.league_players')}</h3>
                <AdminRelationTable
                  rows={league.players}
                  emptyLabel={t('detail.relations_empty')}
                  columns={[
                    {
                      header: 'Játékos',
                      cell: (row) => (
                        <AdminRelationLink
                          href={`/admin/players/${row.playerId}`}
                          label={row.playerName}
                        />
                      ),
                    },
                    {
                      header: 'Pont',
                      cell: (row) => row.totalPoints,
                    },
                  ]}
                />
              </section>
            </div>
          ),
        },
        {
          id: 'audit',
          label: t('detail.tabs.audit'),
          content: <p className="text-muted-foreground text-sm">{t('detail.audit_entity_hint')}</p>,
        },
      ]}
    />
  );
}
