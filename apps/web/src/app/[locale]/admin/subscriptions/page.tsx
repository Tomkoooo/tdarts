import { redirect } from 'next/navigation';

/** Club notification followers live under club detail → Relations. */
export default async function AdminSubscriptionsRedirectPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}/admin/clubs`);
}
