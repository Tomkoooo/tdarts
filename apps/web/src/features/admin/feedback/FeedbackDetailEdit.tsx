'use client';

import { AdminEntityEditPanel } from '@/features/admin/components/AdminEntityEditPanel';
import { FEEDBACK_FIELDS } from '@/features/admin/lib/field-registry';
import { adminPatchFeedbackFieldsAction } from '@/features/admin/feedback/actions';
import toast from 'react-hot-toast';

type Props = {
  locale: string;
  feedbackId: string;
  values: Record<string, unknown>;
};

export function FeedbackDetailEdit({ locale, feedbackId, values }: Props) {
  return (
    <AdminEntityEditPanel
      title="Visszajelzés szerkesztése"
      fields={FEEDBACK_FIELDS}
      values={values}
      onSave={async (patch) => {
        const r = await adminPatchFeedbackFieldsAction(locale, feedbackId, patch);
        if (r.ok) toast.success('Mentve');
        return r;
      }}
    />
  );
}
