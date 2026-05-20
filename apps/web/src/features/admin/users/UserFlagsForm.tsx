'use client';

import { useTransition } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { adminUpdateUserAction } from '@/features/admin/users/actions';
import type { AdminUserListRow } from '@tdarts/services';
import toast from 'react-hot-toast';

type Props = {
  locale: string;
  user: AdminUserListRow & { locale?: string; country?: string | null };
  onSaved?: () => void;
};

export function UserFlagsForm({ locale, user, onSaved }: Props) {
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="border-border max-w-lg space-y-4 rounded-lg border p-4"
      action={(formData) => {
        startTransition(async () => {
          const result = await adminUpdateUserAction(locale, user._id, formData);
          if (result.ok) {
            toast.success('Mentve');
            onSaved?.();
          } else toast.error(result.error ?? 'Hiba');
        });
      }}
    >
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isAdmin" defaultChecked={user.isAdmin} />
        Szuper admin
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isVerified" defaultChecked={user.isVerified} />
        Email megerősítve
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isDeleted" defaultChecked={user.isDeleted} />
        Törölt
      </label>
      <div className="space-y-2">
        <Label htmlFor="adminRoles">Admin szerepkörök (vesszővel)</Label>
        <Input
          id="adminRoles"
          name="adminRoles"
          defaultValue={user.adminRoles.join(', ')}
          placeholder="marketing"
        />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? 'Mentés…' : 'Mentés'}
      </Button>
    </form>
  );
}
