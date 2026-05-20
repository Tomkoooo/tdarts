import { getTranslations } from 'next-intl/server';
import { AdminPageContainer } from '@/features/admin/components/layout/page-container';
import { adminGetUserDetailAction } from '@/features/admin/users/actions';
import { UserDetailTabs } from '@/features/admin/users/UserDetailTabs';
import { AdminDetailBreadcrumb } from '@/features/admin/components/AdminDetailBreadcrumb';
import { Link } from '@/i18n/routing';
import { ChevronLeft } from 'lucide-react';
import { notFound } from 'next/navigation';

type Props = {
  locale: string;
  userId: string;
};

export async function UserDetailView({ locale, userId }: Props) {
  const t = await getTranslations('Admin');
  const result = await adminGetUserDetailAction(userId);
  if (!result.ok) {
    if (result.error === 'User not found') notFound();
    return <p className="text-destructive p-6 text-sm">{result.error}</p>;
  }

  const { user, context, auditLogs } = result;
  if (!user) notFound();
  const title = user.name || user.username || user.email;

  return (
    <>
      <AdminDetailBreadcrumb label={title} />
      <AdminPageContainer pageTitle={title} pageDescription={user.email}>
        <Link
          href="/admin/users"
          className="text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-1 text-sm"
        >
          <ChevronLeft className="size-4" />
          {t('detail.back_to_list')}
        </Link>
        <UserDetailTabs
          locale={locale}
          user={user}
          context={context}
          auditLogs={auditLogs.map((l) => ({
            id: String(l.id ?? l._id ?? ''),
            operation: String(l.operation ?? ''),
            message: String(l.message ?? ''),
            timestamp:
              l.timestamp instanceof Date
                ? l.timestamp.toISOString()
                : String(l.timestamp ?? ''),
          }))}
          userId={userId}
        />
      </AdminPageContainer>
    </>
  );
}
