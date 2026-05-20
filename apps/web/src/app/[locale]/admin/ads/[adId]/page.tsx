import { AdminRouteStub } from '@/features/admin/lib/AdminRouteStub';

export default async function AdminAdDetailPage({
  params,
}: {
  params: Promise<{ adId: string }>;
}) {
  const { adId } = await params;
  return (
    <main className="p-6">
      <AdminRouteStub title={`Ad ${adId}`} />
    </main>
  );
}
