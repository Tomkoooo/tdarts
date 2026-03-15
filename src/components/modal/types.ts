export type AppModalSize = "sm" | "md" | "lg" | "xl" | "full";

export interface AppModalProps {
  open: boolean;
  onOpenChange: (nextOpen: boolean) => void;
  size?: AppModalSize;
  className?: string;
  children: React.ReactNode;
}

export interface UseConfirmModalOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
  variant?: "default" | "destructive";
}
