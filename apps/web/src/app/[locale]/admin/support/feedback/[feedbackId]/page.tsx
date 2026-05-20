import { adminGetFeedbackDetailAction } from '@/features/admin/feedback/actions';
import { FeedbackDetailView } from '@/features/admin/feedback/FeedbackDetailView';
import { notFound } from 'next/navigation';

type Props = {
  params: Promise<{ locale: string; feedbackId: string }>;
};

export default async function AdminFeedbackDetailPage({ params }: Props) {
  const { locale, feedbackId } = await params;
  const result = await adminGetFeedbackDetailAction(feedbackId);
  if (!result.ok) {
    if (result.error === 'Not found') notFound();
    return <p className="text-destructive p-6 text-sm">{result.error}</p>;
  }
  return <FeedbackDetailView locale={locale} feedback={result.feedback} />;
}
