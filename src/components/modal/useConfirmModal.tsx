"use client";

import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/Button";
import type { UseConfirmModalOptions } from "./types";

export function useConfirmModal() {
  const t = useTranslations("Modal");
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<UseConfirmModalOptions | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const open = useCallback((opts: UseConfirmModalOptions) => {
    setOptions(opts);
    setIsOpen(true);
    setIsLoading(false);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setOptions(null);
    setIsLoading(false);
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!options?.onConfirm) {
      close();
      return;
    }
    setIsLoading(true);
    try {
      await options.onConfirm();
      close();
    } catch (err) {
      console.error("Confirm modal action failed:", err);
    } finally {
      setIsLoading(false);
    }
  }, [options, close]);

  const handleCancel = useCallback(() => {
    options?.onCancel?.();
    close();
  }, [options, close]);

  const ConfirmModal = useCallback(
    () =>
      isOpen && options ? (
        <Dialog open={isOpen} onOpenChange={(nextOpen) => { if (!nextOpen) close(); }}>
          <DialogContent className="sm:max-w-md border-border/70 bg-card/90 backdrop-blur-xl">
            <DialogHeader>
              <DialogTitle>{options.title}</DialogTitle>
              <DialogDescription>{options.message}</DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-6 gap-2">
              <Button variant="outline" onClick={handleCancel} disabled={isLoading}>
                {options.cancelText ?? t("confirm.cancel")}
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={isLoading}
                variant={options.variant === "destructive" ? "destructive" : "default"}
              >
                {isLoading && (
                  <span className="w-4 h-4 border-2 border-transparent border-t-current rounded-full animate-spin mr-2" />
                )}
                {options.confirmText ?? t("confirm.confirm")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null,
    [isOpen, options, handleConfirm, handleCancel, isLoading, close, t]
  );

  return { open, close, ConfirmModal };
}
