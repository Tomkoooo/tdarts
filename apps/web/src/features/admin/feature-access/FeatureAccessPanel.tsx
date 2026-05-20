'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { AdminSection } from '@/features/admin/components/AdminSection';
import { adminProbeFeatureAccessAction } from '@/features/admin/feature-access/actions';
import { Badge } from '@/components/ui/Badge';

export function FeatureAccessPanel() {
  const [featureName, setFeatureName] = useState('');
  const [clubId, setClubId] = useState('');
  const [result, setResult] = useState<Awaited<ReturnType<typeof adminProbeFeatureAccessAction>> | null>(
    null,
  );
  const [pending, start] = useTransition();

  return (
    <div className="space-y-6">
      <AdminSection
        title="Funkció hozzáférés (aktuális felhasználó)"
        description="A bejelentkezett admin session alapján értékel — más felhasználó ellenőrzéséhez lásd docs/admin/admin-backend-requirements.md §2."
      >
        <div className="grid max-w-lg gap-4">
          <div className="space-y-2">
            <Label htmlFor="feature">Funkció neve</Label>
            <Input
              id="feature"
              value={featureName}
              onChange={(e) => setFeatureName(e.target.value)}
              placeholder="pl. tournament.create"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="clubId">Club ID (opcionális)</Label>
            <Input
              id="clubId"
              value={clubId}
              onChange={(e) => setClubId(e.target.value)}
              placeholder="Mongo ObjectId"
              className="font-mono text-sm"
            />
          </div>
          <Button
            type="button"
            disabled={pending || !featureName.trim()}
            onClick={() => {
              start(async () => {
                const r = await adminProbeFeatureAccessAction(
                  featureName.trim(),
                  clubId.trim() || undefined,
                );
                setResult(r);
              });
            }}
          >
            {pending ? 'Ellenőrzés…' : 'Ellenőrzés'}
          </Button>
        </div>
      </AdminSection>

      {result ? (
        <AdminSection title="Eredmény">
          {!result.ok ? (
            <p className="text-destructive text-sm">{result.error}</p>
          ) : (
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Állapot:</span>
                {result.result.ok ? (
                  <Badge variant="success">Engedélyezve</Badge>
                ) : (
                  <Badge variant="destructive">{result.result.code}</Badge>
                )}
              </div>
              {!result.result.ok ? (
                <p>{result.result.message}</p>
              ) : (
                <pre className="bg-muted overflow-auto rounded-lg p-4 text-xs">
                  {JSON.stringify(result.result.data, null, 2)}
                </pre>
              )}
            </div>
          )}
        </AdminSection>
      ) : null}
    </div>
  );
}
