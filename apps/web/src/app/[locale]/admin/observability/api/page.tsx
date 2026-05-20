import { redirect } from 'next/navigation';

/** Analytics merged into main telemetry dashboard (legacy TelemetryDashboardV2). */
export default async function ObservabilityApiPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}/admin/observability`);
}
