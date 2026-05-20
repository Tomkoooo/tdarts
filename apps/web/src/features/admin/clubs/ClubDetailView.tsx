import { getTranslations } from 'next-intl/server';
import { AdminDetailShell } from '@/features/admin/detail/AdminDetailShell';
import { AdminField, AdminFieldGrid } from '@/features/admin/detail/AdminFieldGrid';
import { AdminRelationLink } from '@/features/admin/detail/AdminRelationLink';
import { AdminRelationTable } from '@/features/admin/detail/AdminRelationTable';
import { formatBool, formatText } from '@/features/admin/detail/format-value';
import { formatAdminDate } from '@/features/admin/list/format';
import { adminGetClubDetailAction } from '@/features/admin/clubs/actions';
import { ClubDetailEdit } from '@/features/admin/clubs/ClubDetailEdit';
import { notFound } from 'next/navigation';

type Props = {
  locale: string;
  clubId: string;
};

export async function ClubDetailView({ locale, clubId }: Props) {
  const t = await getTranslations('Admin');
  const result = await adminGetClubDetailAction(clubId);
  if (!result.ok) {
    if (result.error === 'Club not found') notFound();
    return <p className="text-destructive p-6 text-sm">{result.error}</p>;
  }

  const { club, context, notificationFollowers } = result;
  const name = String(club.name ?? 'Klub');
  const contact = club.contact as { email?: string } | undefined;

  return (
    <AdminDetailShell
      title={name}
      description={contact?.email ?? undefined}
      backHref="/admin/clubs"
      backLabel={t('detail.back_to_list')}
      tabs={[
        {
          id: 'identity',
          label: t('detail.tabs.identity'),
          content: (
            <>
              <AdminFieldGrid>
                <AdminField label="Név">{name}</AdminField>
                <AdminField label="Ország">{formatText(club.country)}</AdminField>
                <AdminField label="Hely">{formatText(club.location)}</AdminField>
                <AdminField label="Csomag">{formatText(club.subscriptionModel)}</AdminField>
                <AdminField label="Tagok">{String(club.membersCount ?? 0)}</AdminField>
                <AdminField label="Verified">{formatBool(Boolean(club.verified))}</AdminField>
                <AdminField label="Aktív">{formatBool(Boolean(club.isActive))}</AdminField>
                <AdminField label="Frissítve">
                  {formatAdminDate(
                    club.updatedAt instanceof Date
                      ? club.updatedAt.toISOString()
                      : String(club.updatedAt ?? ''),
                  )}
                </AdminField>
              </AdminFieldGrid>
              <ClubDetailEdit
                locale={locale}
                clubId={clubId}
                profileValues={{
                  name: club.name ?? '',
                  description: String(club.description ?? ''),
                  location: String(club.location ?? ''),
                  country: String(club.country ?? ''),
                  landingPage: {
                    aboutText: String(
                      (club.landingPage as { aboutText?: string } | undefined)?.aboutText ?? '',
                    ),
                  },
                }}
                flagValues={{
                  verified: Boolean(club.verified),
                  isActive: Boolean(club.isActive),
                  subscriptionModel: String(club.subscriptionModel ?? 'free'),
                }}
              />
            </>
          ),
        },
        {
          id: 'relations',
          label: t('detail.tabs.relations'),
          content: (
            <div className="space-y-8">
              <section>
                <h3 className="mb-3 text-sm font-semibold">{t('detail.club_admins')}</h3>
                <AdminRelationTable
                  rows={context?.admins ?? []}
                  emptyLabel={t('detail.relations_empty')}
                  columns={[
                    {
                      header: 'Staff',
                      cell: (row) => (
                        <AdminRelationLink
                          href={`/admin/users/${row._id}`}
                          label={row.name || row.email}
                          sublabel={row.email}
                        />
                      ),
                    },
                  ]}
                />
              </section>
              <section>
                <h3 className="mb-3 text-sm font-semibold">{t('detail.club_members')}</h3>
                <AdminRelationTable
                  rows={context?.members ?? []}
                  emptyLabel={t('detail.relations_empty')}
                  columns={[
                    {
                      header: 'Játékos',
                      cell: (row) => (
                        <AdminRelationLink
                          href={`/admin/players/${row._id}`}
                          label={row.name}
                        />
                      ),
                    },
                  ]}
                />
              </section>
              <section>
                <h3 className="mb-3 text-sm font-semibold">{t('detail.club_tournaments')}</h3>
                <AdminRelationTable
                  rows={context?.tournaments ?? []}
                  emptyLabel={t('detail.relations_empty')}
                  columns={[
                    {
                      header: 'Verseny',
                      cell: (row) => (
                        <AdminRelationLink
                          href={`/admin/tournaments/${row._id}`}
                          label={row.name || row.tournamentId}
                          sublabel={`${row.tournamentId} · ${row.status}`}
                        />
                      ),
                    },
                    {
                      header: 'Létrehozva',
                      cell: (row) => formatAdminDate(row.createdAt),
                    },
                  ]}
                />
              </section>
              <section>
                <h3 className="mb-3 text-sm font-semibold">Értesítési feliratkozók</h3>
                <AdminRelationTable
                  rows={notificationFollowers ?? []}
                  emptyLabel={t('detail.relations_empty')}
                  columns={[
                    {
                      header: 'Felhasználó',
                      cell: (row) => (
                        <AdminRelationLink
                          href={`/admin/users/${row.userId}`}
                          label={row.userEmail || row.userId}
                        />
                      ),
                    },
                    {
                      header: 'Feliratkozás',
                      cell: (row) => formatAdminDate(row.createdAt),
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
