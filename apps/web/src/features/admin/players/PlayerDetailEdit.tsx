'use client';

import { AdminEntityEditPanel } from '@/features/admin/components/AdminEntityEditPanel';
import { PLAYER_PROFILE_FIELDS } from '@/features/admin/lib/field-registry';
import { adminPatchPlayerFieldsAction } from '@/features/admin/players/actions';
import toast from 'react-hot-toast';

type Props = {
  locale: string;
  playerId: string;
  values: Record<string, unknown>;
};

export function PlayerDetailEdit({ locale, playerId, values }: Props) {
  const fields = PLAYER_PROFILE_FIELDS.map((f) =>
    f.kind === 'relation' && f.key === 'userRef'
      ? { ...f, displayLabel: values.userRefLabel as string | undefined }
      : f,
  );

  return (
    <AdminEntityEditPanel
      title="Profil szerkesztése"
      fields={fields}
      values={values}
      onSave={async (patch) => {
        const r = await adminPatchPlayerFieldsAction(locale, playerId, patch);
        if (r.ok) toast.success('Mentve');
        return r;
      }}
    />
  );
}
