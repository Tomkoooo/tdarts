'use client';

import { AdminSchemaForm } from '@/features/admin/forms/AdminSchemaForm';
import type { FieldSpec } from '@/features/admin/lib/field-registry';

type Props = {
  title?: string;
  fields: FieldSpec[];
  values: Record<string, unknown>;
  onSave: (patch: Record<string, unknown>) => Promise<{ ok: boolean; error?: string }>;
};

/** Inline editable block for detail pages and sheets. */
export function AdminEntityEditPanel({ title = 'Szerkesztés', fields, values, onSave }: Props) {
  return (
    <div className="mt-6 space-y-3">
      <h3 className="text-sm font-semibold">{title}</h3>
      <AdminSchemaForm fields={fields} values={values} onSubmit={onSave} />
    </div>
  );
}
