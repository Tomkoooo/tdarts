'use client';

import { useState, useTransition } from 'react';
import { useParams } from 'next/navigation';
import { AdminConfirmDialog } from '@/features/admin/components/AdminConfirmDialog';
import { AdminSection } from '@/features/admin/components/AdminSection';
import { adminRevalidateDashboardAction, adminRunYearWrapAction } from '@/features/admin/tools/actions';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';

export function AdminToolsPanel() {
  const params = useParams();
  const locale = String(params?.locale ?? 'hu');
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [revalidateOpen, setRevalidateOpen] = useState(false);
  const [yearWrapOpen, setYearWrapOpen] = useState(false);
  const [year, setYear] = useState(String(new Date().getFullYear() - 1));

  return (
    <div className="space-y-6">
      <AdminSection title="Cache és összegzések">
        <p className="text-muted-foreground text-sm">
          A Next.js admin útvonalak újratöltése Mongo-ból. Biztonságos productionben; nem tör adatot.
        </p>
        {msg ? <p className="mt-2 text-xs text-muted-foreground">{msg}</p> : null}
        <button
          type="button"
          className="mt-3 rounded-md border border-border px-3 py-1.5 text-sm font-medium hover:bg-muted/50"
          onClick={() => {
            setMsg(null);
            setRevalidateOpen(true);
          }}
        >
          Admin cache frissítése…
        </button>
      </AdminSection>

      <AdminSection title="Yearly wrap (MMR / honors)">
        <p className="text-muted-foreground text-sm">
          Éves reset minden játékosra — <span className="font-mono">YearWrapService.performYearlyReset</span>.
          Csak szándékos karbantartáskor.
        </p>
        <div className="mt-3 max-w-xs space-y-2">
          <Label htmlFor="wrap-year">Év</Label>
          <Input
            id="wrap-year"
            type="number"
            value={year}
            onChange={(e) => setYear(e.target.value)}
          />
        </div>
        <button
          type="button"
          className="mt-3 rounded-md border border-destructive/50 px-3 py-1.5 text-sm font-medium text-destructive hover:bg-destructive/10"
          onClick={() => setYearWrapOpen(true)}
        >
          Year wrap futtatása…
        </button>
      </AdminSection>

      <AdminSection title="Load és stressz">
        <p className="text-muted-foreground text-sm">
          Load tesztek CLI-ből:{' '}
          <span className="font-mono text-xs">pnpm test:load:diagnostics:stress</span>. A korábbi
          in-app stress API eltávolítva biztonsági okokból.
        </p>
        <p className="text-muted-foreground mt-2 text-xs">
          Backfill scriptek (locations, averages, MMR) a{' '}
          <span className="font-mono">apps/web/package.json</span> alatt — csak product jóváhagyással
          köthetők ide.
        </p>
      </AdminSection>

      <AdminConfirmDialog
        open={yearWrapOpen}
        onOpenChange={setYearWrapOpen}
        variant="danger"
        title="Year wrap futtatása?"
        description={`Év: ${year}. Minden játékos MMR reset és honors kiosztás — visszafordíthatatlan adatmódosítás.`}
        confirmPhrase="YEARWRAP"
        confirmLabel="Futtatás"
        pending={pending}
        onConfirm={() => {
          start(async () => {
            const y = parseInt(year, 10);
            const r = await adminRunYearWrapAction(locale, y);
            setMsg(
              r.ok
                ? `Kész: ${r.result?.processed ?? 0} játékos, ${r.result?.honorsAwarded ?? 0} honor.`
                : r.error ?? 'Hiba',
            );
            if (r.ok) setYearWrapOpen(false);
          });
        }}
      />

      <AdminConfirmDialog
        open={revalidateOpen}
        onOpenChange={setRevalidateOpen}
        title="Admin cache frissítése?"
        description={
          <>
            <p>Revalidálja az admin home és observability RSC útvonalakat ({locale}).</p>
            <p className="text-xs">Admin audit naplóba kerül.</p>
          </>
        }
        confirmPhrase="REFRESH"
        confirmLabel="Frissítés"
        pending={pending}
        onConfirm={() => {
          start(async () => {
            const r = await adminRevalidateDashboardAction(locale);
            setMsg(r.ok ? 'Cache frissítve.' : r.error ?? 'Hiba');
            if (r.ok) setRevalidateOpen(false);
          });
        }}
      />
    </div>
  );
}
