import { getTranslations } from 'next-intl/server';
import { AdminDetailShell } from '@/features/admin/detail/AdminDetailShell';
import { AdminField, AdminFieldGrid } from '@/features/admin/detail/AdminFieldGrid';
import { AdminRelationLink } from '@/features/admin/detail/AdminRelationLink';
import { AdminRelationTable } from '@/features/admin/detail/AdminRelationTable';
import { formatText } from '@/features/admin/detail/format-value';
import { formatAdminDate } from '@/features/admin/list/format';
import { adminGetPlayerDetailAction } from '@/features/admin/players/actions';
import { notFound } from 'next/navigation';
import { PlayerDetailEdit } from '@/features/admin/players/PlayerDetailEdit';

type Props = {
  locale: string;
  playerId: string;
};

export async function PlayerDetailView({ locale, playerId }: Props) {
  const t = await getTranslations('Admin');
  const result = await adminGetPlayerDetailAction(playerId);
  if (!result.ok) {
    if (result.error === 'Player not found') notFound();
    return <p className="text-destructive p-6 text-sm">{result.error}</p>;
  }

  const { player, context } = result;
  const stats = player.stats as Record<string, number> | undefined;
  const name = String(player.name ?? '');

  return (
    <AdminDetailShell
      title={name}
      description={formatText(player.country)}
      backHref="/admin/players"
      backLabel={t('detail.back_to_list')}
      tabs={[
        {
          id: 'identity',
          label: t('detail.tabs.identity'),
          content: (
            <>
              <AdminFieldGrid>
                <AdminField label="Név">{name}</AdminField>
                <AdminField label="Ország">{formatText(player.country)}</AdminField>
                <AdminField label="Típus">{formatText(player.type)}</AdminField>
                <AdminField label="MMR">{stats?.mmr ?? 0}</AdminField>
                <AdminField label="OAC MMR">{stats?.oacMmr ?? 0}</AdminField>
                <AdminField label="Versenyek">{stats?.tournamentsPlayed ?? 0}</AdminField>
              </AdminFieldGrid>
              <PlayerDetailEdit
                locale={locale}
                playerId={playerId}
                values={{
                  name: player.name ?? '',
                  country: player.country ?? '',
                  type: player.type ?? 'individual',
                  publicConsent: Boolean(player.publicConsent),
                  userRef:
                    context?.linkedUser?._id != null ? String(context.linkedUser._id) : null,
                  userRefLabel:
                    context?.linkedUser?.name || context?.linkedUser?.username || undefined,
                  honors: Array.isArray(player.honors) ? player.honors : [],
                }}
              />
            </>
          ),
        },
        {
          id: 'relations',
          label: t('detail.tabs.relations'),
          content: (
            <div className="space-y-6">
              <AdminField label="Felhasználói fiók">
                {context?.linkedUser ? (
                  <AdminRelationLink
                    href={`/admin/users/${context.linkedUser._id}`}
                    label={context.linkedUser.name || context.linkedUser.username}
                    sublabel={context.linkedUser.email}
                  />
                ) : (
                  '—'
                )}
              </AdminField>
              <section>
                <h3 className="mb-3 text-sm font-semibold">{t('detail.player_tournaments')}</h3>
                <AdminRelationTable
                  rows={context?.recentTournaments ?? []}
                  emptyLabel={t('detail.relations_empty')}
                  columns={[
                    {
                      header: 'Verseny',
                      cell: (row) => (
                        <AdminRelationLink
                          href={
                            row.mongoId
                              ? `/admin/tournaments/${row.mongoId}`
                              : `/admin/tournaments?search=${encodeURIComponent(row.tournamentId)}`
                          }
                          label={row.name ?? row.tournamentId}
                          sublabel={
                            row.placement != null ? `#${row.placement}` : row.tournamentId
                          }
                        />
                      ),
                    },
                    {
                      header: 'Dátum',
                      cell: (row) =>
                        row.date ? formatAdminDate(row.date) : '—',
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
