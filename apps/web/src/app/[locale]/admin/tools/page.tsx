import React from 'react';
import { notFound } from 'next/navigation';
import { getStaffSession, staffHasCapability } from '@/features/admin/rbac/staff-session';
import { ADMIN_CAPABILITIES } from '@tdarts/services';

export default async function AdminToolsPage() {
  const session = await getStaffSession();
  if (!session || !staffHasCapability(session, ADMIN_CAPABILITIES.ADMIN_TOOLS_EXECUTE)) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Tools</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gated operational utilities. Each action should log to the audit trail when implemented.
        </p>
      </div>

      <section className="rounded-xl border border-border/60 bg-card/40 p-4">
        <h2 className="text-sm font-semibold">Load testing (legacy)</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Artillery profiles still live under <span className="font-mono text-xs">apps/web/src/features/tests/load/</span>. Re-attach a
          guarded stress-runner API if you need in-app control again.
        </p>
      </section>

      <section className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
        <h2 className="text-sm font-semibold text-amber-200">No destructive tool selected</h2>
        <p className="mt-2 text-xs text-muted-foreground">
          Add backfills here as server actions with `ADMIN_TOOLS_EXECUTE`, double confirmation, and `AdminAuditService` logging.
        </p>
      </section>
    </div>
  );
}
