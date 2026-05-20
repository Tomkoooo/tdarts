'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/textarea';
import {
  adminLinkPlayerUserAction,
  adminUpdatePlayerHonorsAction,
} from '@/features/admin/players/actions';
import toast from 'react-hot-toast';

type Props = {
  locale: string;
  playerId: string;
  userRef?: string | null;
  honors: unknown[];
};

export function PlayerAdminExtras({ locale, playerId, userRef, honors }: Props) {
  const [pending, start] = useTransition();
  const [honorsRaw, setHonorsRaw] = useState(JSON.stringify(honors ?? [], null, 2));
  const [linkUserId, setLinkUserId] = useState(userRef ?? '');

  return (
    <div className="space-y-6">
      <div className="border-border space-y-3 rounded-lg border p-4">
        <h3 className="text-sm font-semibold">User profil kapcsolat</h3>
        <div className="space-y-2">
          <Label htmlFor="userRef">User ObjectId</Label>
          <Input
            id="userRef"
            value={linkUserId}
            onChange={(e) => setLinkUserId(e.target.value)}
            className="font-mono text-sm"
            placeholder="Üres = leválasztás"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={() => {
            start(async () => {
              const r = await adminLinkPlayerUserAction(locale, playerId, linkUserId);
              if (r.ok) toast.success('User link mentve');
              else toast.error(r.error ?? 'Hiba');
            });
          }}
        >
          User link mentése
        </Button>
      </div>

      <div className="border-border space-y-3 rounded-lg border p-4">
        <h3 className="text-sm font-semibold">Honors (JSON tömb)</h3>
        <Textarea
          className="min-h-[160px] font-mono text-xs"
          value={honorsRaw}
          onChange={(e) => setHonorsRaw(e.target.value)}
          spellCheck={false}
        />
        <Button
          type="button"
          disabled={pending}
          onClick={() => {
            start(async () => {
              const r = await adminUpdatePlayerHonorsAction(locale, playerId, honorsRaw);
              if (r.ok) toast.success('Honors mentve');
              else toast.error(r.error ?? 'Hiba');
            });
          }}
        >
          Honors mentése
        </Button>
      </div>
    </div>
  );
}
