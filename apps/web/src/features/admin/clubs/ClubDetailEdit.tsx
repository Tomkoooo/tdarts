'use client';

import { AdminEntityEditPanel } from '@/features/admin/components/AdminEntityEditPanel';
import { CLUB_FLAG_FIELDS, CLUB_PROFILE_FIELDS } from '@/features/admin/lib/field-registry';
import { adminPatchClubFieldsAction } from '@/features/admin/clubs/actions';
import toast from 'react-hot-toast';

type Props = {
  locale: string;
  clubId: string;
  profileValues: Record<string, unknown>;
  flagValues: Record<string, unknown>;
};

export function ClubDetailEdit({ locale, clubId, profileValues, flagValues }: Props) {
  return (
    <>
      <AdminEntityEditPanel
        title="Profil"
        fields={CLUB_PROFILE_FIELDS}
        values={profileValues}
        onSave={async (patch) => {
          const r = await adminPatchClubFieldsAction(locale, clubId, patch);
          if (r.ok) toast.success('Mentve');
          return r;
        }}
      />
      <AdminEntityEditPanel
        title="Flagek és csomag"
        fields={CLUB_FLAG_FIELDS}
        values={flagValues}
        onSave={async (patch) => {
          const r = await adminPatchClubFieldsAction(locale, clubId, patch);
          if (r.ok) toast.success('Mentve');
          return r;
        }}
      />
    </>
  );
}
