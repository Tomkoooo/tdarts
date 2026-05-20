import { adminGetApiErrorAction } from '@/features/admin/observability/actions';
import { ApiErrorDetailView } from '@/features/admin/observability/ApiErrorDetailView';
import { notFound } from 'next/navigation';

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export default async function ObservabilityErrorDetailPage({ params }: Props) {
  const { locale, id } = await params;
  const result = await adminGetApiErrorAction(id);
  if (!result.ok) {
    if (result.error === 'Not found') notFound();
    return <p className="text-destructive p-6 text-sm">{result.error}</p>;
  }
  return <ApiErrorDetailView locale={locale} event={result.event} />;
}
