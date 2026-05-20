'use client';

import type { AdminUserListRow } from '@tdarts/services';
import { AdminDetailTabs } from '@/features/admin/detail/AdminDetailTabs';
import { AdminAuditList } from '@/features/admin/detail/AdminAuditList';
import { AdminRelationLink } from '@/features/admin/detail/AdminRelationLink';
import { AdminEntityEditPanel } from '@/features/admin/components/AdminEntityEditPanel';
import { USER_FLAG_FIELDS, USER_PROFILE_FIELDS } from '@/features/admin/lib/field-registry';
import { adminPatchUserFieldsAction } from '@/features/admin/users/actions';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import toast from 'react-hot-toast';

type User = AdminUserListRow & {
  locale?: string;
  country?: string | null;
  adminRoles?: string[];
};

type Context = {
  linkedPlayerId: string | null;
  linkedPlayerName?: string | null;
  subscriptionCount: number;
  managedClubsCount: number;
} | null;

type AuditLog = {
  id: string;
  operation: string;
  message: string;
  timestamp: string;
};

type Props = {
  locale: string;
  user: User;
  context: Context;
  auditLogs: AuditLog[];
  userId: string;
  showFullPageLink?: boolean;
  onSaved?: () => void;
};

export function UserDetailTabs({
  locale,
  user,
  context,
  auditLogs,
  userId,
  showFullPageLink,
  onSaved,
}: Props) {
  const t = useTranslations('Admin');

  const profileValues: Record<string, unknown> = {
    name: user.name,
    username: user.username,
    email: user.email,
    locale: user.locale ?? 'hu',
    country: user.country ?? '',
    isAdmin: user.isAdmin,
    isVerified: user.isVerified,
    isDeleted: user.isDeleted,
    adminRoles: user.adminRoles?.join(', ') ?? '',
  };

  return (
    <div className="space-y-3">
      {showFullPageLink ? (
        <Link
          href={`/admin/users/${userId}`}
          className="text-primary text-sm font-medium hover:underline"
        >
          Teljes oldal megnyitása →
        </Link>
      ) : null}
      <AdminDetailTabs
        tabs={[
          {
            id: 'identity',
            label: t('detail.tabs.identity'),
            content: (
              <>
                <AdminEntityEditPanel
                  title="Profil"
                  fields={USER_PROFILE_FIELDS}
                  values={profileValues}
                  onSave={async (patch) => {
                    const r = await adminPatchUserFieldsAction(locale, userId, patch);
                    if (r.ok) {
                      toast.success('Mentve');
                      onSaved?.();
                    }
                    return r;
                  }}
                />
                <AdminEntityEditPanel
                  title={t('detail.edit_flags')}
                  fields={USER_FLAG_FIELDS}
                  values={profileValues}
                  onSave={async (patch) => {
                    const r = await adminPatchUserFieldsAction(locale, userId, patch);
                    if (r.ok) {
                      toast.success('Mentve');
                      onSaved?.();
                    }
                    return r;
                  }}
                />
              </>
            ),
          },
          {
            id: 'relations',
            label: t('detail.tabs.relations'),
            content: (
              <div className="space-y-2 text-sm">
                <p>
                  <span className="text-muted-foreground">Kapcsolt játékos: </span>
                  {context?.linkedPlayerId ? (
                    <AdminRelationLink
                      href={`/admin/players/${context.linkedPlayerId}`}
                      label={context.linkedPlayerName ?? t('detail.view_player')}
                    />
                  ) : (
                    '—'
                  )}
                </p>
                <p>
                  <span className="text-muted-foreground">Előfizetések: </span>
                  {context?.subscriptionCount ?? 0}
                </p>
                <p>
                  <span className="text-muted-foreground">Kezelt klubok: </span>
                  {context?.managedClubsCount ?? 0}
                </p>
              </div>
            ),
          },
          {
            id: 'audit',
            label: t('detail.tabs.audit'),
            content: <AdminAuditList logs={auditLogs} emptyLabel={t('detail.audit_empty')} />,
          },
        ]}
      />
    </div>
  );
}
