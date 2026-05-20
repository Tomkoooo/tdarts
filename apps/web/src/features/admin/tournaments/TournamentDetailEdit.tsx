'use client';

import { AdminEntityEditPanel } from '@/features/admin/components/AdminEntityEditPanel';
import {
  TOURNAMENT_FLAG_FIELDS,
  TOURNAMENT_SETTINGS_FIELDS,
} from '@/features/admin/lib/field-registry';
import { adminPatchTournamentFieldsAction } from '@/features/admin/tournaments/actions';
import toast from 'react-hot-toast';

type Props = {
  locale: string;
  tournamentId: string;
  settingsValues: Record<string, unknown>;
  flagValues: Record<string, unknown>;
};

export function TournamentDetailEdit({
  locale,
  tournamentId,
  settingsValues,
  flagValues,
}: Props) {
  const settingsFields = TOURNAMENT_SETTINGS_FIELDS.map((f) =>
    f.kind === 'relation' && f.key === 'clubId'
      ? { ...f, displayLabel: settingsValues.clubDisplayLabel as string | undefined }
      : f,
  );

  return (
    <>
      <AdminEntityEditPanel
        title="Verseny beállítások"
        fields={settingsFields}
        values={settingsValues}
        onSave={async (patch) => {
          const r = await adminPatchTournamentFieldsAction(locale, tournamentId, patch);
          if (r.ok) toast.success('Mentve');
          return r;
        }}
      />
      <AdminEntityEditPanel
        title="Flagek"
        fields={TOURNAMENT_FLAG_FIELDS}
        values={flagValues}
        onSave={async (patch) => {
          const r = await adminPatchTournamentFieldsAction(locale, tournamentId, patch);
          if (r.ok) toast.success('Mentve');
          return r;
        }}
      />
    </>
  );
}
