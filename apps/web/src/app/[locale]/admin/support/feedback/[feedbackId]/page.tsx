import { AdminRouteStub } from '@/features/admin/lib/AdminRouteStub';

export default async function AdminFeedbackDetailPage({
  params,
}: {
  params: Promise<{ feedbackId: string }>;
}) {
  const { feedbackId } = await params;
  return (
    <main className="p-6">
      <AdminRouteStub title={`Feedback ${feedbackId}`} />
    </main>
  );
}
