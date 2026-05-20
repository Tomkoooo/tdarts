import { AdminRouteStub } from '@/features/admin/lib/AdminRouteStub';

export default function AdminSystemPage() {
  return (
    <main className="p-6">
      <AdminRouteStub title="System settings" note="Wire UI to features/admin/system/actions.ts" />
    </main>
  );
}
