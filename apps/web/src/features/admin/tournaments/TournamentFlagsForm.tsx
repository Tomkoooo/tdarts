'use client';

import { useTransition } from 'react';
import { Button } from '@/components/ui/Button';
import { adminUpdateTournamentFlagsAction } from '@/features/admin/tournaments/actions';
import toast from 'react-hot-toast';

type Props = {
  locale: string;
  tournamentId: string;
  flags: {
    isArchived: boolean;
    isSandbox: boolean;
    isDeleted: boolean;
    verified: boolean;
  };
};

export function TournamentFlagsForm({ locale, tournamentId, flags }: Props) {
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="border-border max-w-lg space-y-4 rounded-lg border p-4"
      action={(formData) => {
        startTransition(async () => {
          const result = await adminUpdateTournamentFlagsAction(locale, tournamentId, formData);
          if (result.ok) toast.success('Mentve');
          else toast.error(result.error ?? 'Hiba');
        });
      }}
    >
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="verified" defaultChecked={flags.verified} />
        Verified
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isArchived" defaultChecked={flags.isArchived} />
        Archivált
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isSandbox" defaultChecked={flags.isSandbox} />
        Sandbox
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isDeleted" defaultChecked={flags.isDeleted} />
        Törölt
      </label>
      <Button type="submit" disabled={pending}>
        {pending ? 'Mentés…' : 'Mentés'}
      </Button>
    </form>
  );
}
