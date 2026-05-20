'use client';

import { useTransition } from 'react';
import { Button } from '@/components/ui/Button';
import { adminUpdateClubFlagsAction, adminUpdateClubSubscriptionAction } from '@/features/admin/clubs/actions';
import toast from 'react-hot-toast';

type Props = {
  locale: string;
  clubId: string;
  verified: boolean;
  isActive: boolean;
  subscriptionModel: string;
};

const TIERS = ['free', 'basic', 'pro', 'enterprise'] as const;

export function ClubFlagsForm({ locale, clubId, verified, isActive, subscriptionModel }: Props) {
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="border-border max-w-lg space-y-4 rounded-lg border p-4"
      action={(formData) => {
        startTransition(async () => {
          const result = await adminUpdateClubFlagsAction(locale, clubId, formData);
          if (result.ok) toast.success('Mentve');
          else toast.error(result.error ?? 'Hiba');
        });
      }}
    >
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="verified" defaultChecked={verified} />
        Verified
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isActive" defaultChecked={isActive} />
        Aktív
      </label>
      <div className="space-y-2">
        <label htmlFor="subscriptionModel" className="text-sm font-medium">
          Előfizetési csomag
        </label>
        <select
          id="subscriptionModel"
          name="subscriptionModel"
          className="border-border bg-background w-full rounded-md border px-2 py-2 text-sm"
          defaultValue={subscriptionModel}
          onChange={(e) => {
            startTransition(async () => {
              const r = await adminUpdateClubSubscriptionAction(
                locale,
                clubId,
                e.target.value as (typeof TIERS)[number],
              );
              if (r.ok) toast.success('Csomag mentve');
              else toast.error(r.error ?? 'Hiba');
            });
          }}
        >
          {TIERS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? 'Mentés…' : 'Mentés'}
      </Button>
    </form>
  );
}
