import React from 'react';
import toast from 'react-hot-toast';

interface ErrorToastOptions {
  error?: string;
  context?: string;
  showReportButton?: boolean;
}

/**
 * Enhanced error toast with optional error reporting link
 */
export const showErrorToast = (message: string, options: ErrorToastOptions = {}) => {
  const { error, context, showReportButton = true } = options;
  
  if (showReportButton) {
    // Create error reporting URL with context
    const reportUrl = new URL('/feedback', window.location.origin);
    reportUrl.searchParams.set('category', 'bug');
    reportUrl.searchParams.set('title', `Hiba: ${context || 'Ismeretlen helyen'}`);
    reportUrl.searchParams.set('description', `Hibaüzenet: ${message}\n\n${error ? `Technikai részletek: ${error}` : ''}\n\nOldal: ${window.location.pathname}`);
    reportUrl.searchParams.set('page', window.location.pathname);
    
    // Show toast with action button
    toast.error(
      (t) => {
        const handleReportClick = () => {
          window.open(reportUrl.toString(), '_blank', 'noopener,noreferrer');
          toast.dismiss(t.id);
        };
        
        return (
          <div className="flex flex-col gap-2">
            <span>{message}</span>
            <button
              onClick={handleReportClick}
              className="btn btn-xs btn-outline btn-error"
            >
              Hibabejelentés
            </button>
          </div>
        );
      },
      {
        duration: 8000, // Longer duration to allow user to click report button
        id: `error-${Date.now()}`, // Unique ID to prevent duplicates
      }
    );
  } else {
    // Simple error toast without report button
    toast.error(message, {
      duration: 4000,
    });
  }
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
    showErrorToast(message, { showReportButton: false });
  }
};
