'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { adminSetUserPasswordAction, adminUpdateUserAction } from '@/features/admin/users/actions';
import type { AdminUserListRow } from '@tdarts/services';
import toast from 'react-hot-toast';

type Props = {
  locale: string;
  user: AdminUserListRow & { locale?: string; country?: string | null };
  onSaved?: () => void;
};

export function UserAccountForm({ locale, user, onSaved }: Props) {
  const [pending, start] = useTransition();
  const [password, setPassword] = useState('');

  return (
    <div className="space-y-6">
      <form
        className="border-border space-y-4 rounded-lg border p-4"
        action={(formData) => {
          start(async () => {
            const result = await adminUpdateUserAction(locale, user._id, formData);
            if (result.ok) {
              toast.success('Mentve');
              onSaved?.();
            } else toast.error(result.error ?? 'Hiba');
          });
        }}
      >
        <h3 className="text-sm font-semibold">Jogosultságok és fiók</h3>
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
          Törölt fiók
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

      <div className="border-border space-y-3 rounded-lg border p-4">
        <h3 className="text-sm font-semibold">Jelszó beállítása</h3>
        <div className="space-y-2">
          <Label htmlFor="newPassword">Új jelszó (min. 8 karakter)</Label>
          <Input
            id="newPassword"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          disabled={pending || password.length < 8}
          onClick={() => {
            start(async () => {
              const r = await adminSetUserPasswordAction(locale, user._id, password);
              if (r.ok) {
                toast.success('Jelszó beállítva');
                setPassword('');
              } else toast.error(r.error ?? 'Hiba');
            });
          }}
        >
          Jelszó mentése
        </Button>
      </div>
    </div>
  );
}
