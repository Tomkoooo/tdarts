import { redirect } from 'next/navigation';

/** Legacy URL → new observability telemetry dashboard. */
export default async function AdminTelemetryLegacyRedirect({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}/admin/observability`);
}
