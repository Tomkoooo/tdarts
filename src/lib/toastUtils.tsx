import React from 'react';
import { IconBug } from '@tabler/icons-react';
import toast from 'react-hot-toast';

import { Button } from '@/components/ui/Button';

interface ErrorToastOptions {
  error?: string;
  context?: string;
  errorName?: string;
  reportable?: boolean;
}

/**
 * Enhanced error toast with optional error reporting link.
 * Adds a CTA that routes users to the feedback page with prefilled params.
 */
export const showErrorToast = (message: string, options: ErrorToastOptions = {}) => {
  const { error, context, errorName, reportable = true } = options;
  const canUseWindow = typeof window !== 'undefined';

  if (reportable && canUseWindow) {
    const reportUrl = new URL('/feedback', window.location.origin);
    reportUrl.searchParams.set('category', 'bug');
    reportUrl.searchParams.set('title', errorName || context || 'Ismeretlen hiba');

    const descriptionParts = [
      `Hibaüzenet: ${message}`,
      error ? `\n\nTechnikai részletek: ${error}` : '',
      context ? `\n\nKontekstus: ${context}` : '',
      `\n\nOldal: ${window.location.pathname}`,
    ].filter(Boolean);

    reportUrl.searchParams.set('description', descriptionParts.join(' ').trim());
    reportUrl.searchParams.set('page', window.location.pathname);

    toast.error(
      (t) => (
        <div className="flex flex-col gap-2 text-black">
          <span className="text-sm font-medium">{message}</span>
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-2 text-white"
            onClick={() => {
              window.location.href = reportUrl.toString();
              toast.dismiss(t.id);
            }}
          >
            <IconBug size={16} className="text-destructive" />
            Hibabejelentés
          </Button>
        </div>
      ),
      {
        duration: 8000,
        id: `error-${Date.now()}`,
      }
    );
    return;
  }

  toast.error(message, {
    duration: 4000,
  });
};

/**
 * Enhanced success toast
 */
export const showSuccessToast = (message: string) => {
  toast.success(message, {
    duration: 3000,
  });
};

/**
 * Enhanced loading toast
 */
export const showLoadingToast = (message: string) => {
  return toast.loading(message);
};

/**
 * Update existing toast
 */
export const updateToast = (toastId: string, type: 'success' | 'error', message: string) => {
  if (type === 'success') {
    toast.success(message, { id: toastId });
  } else {
    showErrorToast(message, { reportable: false });
  }
};
