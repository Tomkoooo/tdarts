"use client";

import { useCallback, useMemo, useRef, useState } from "react";
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
      close();
    } finally {
      setIsLoading(false);
    }
  }, [options, close]);

  const handleCancel = useCallback(() => {
    options?.onCancel?.();
    close();
  }, [options, close]);

  const stateRef = useRef({
    isOpen,
    options,
    isLoading,
  });
  stateRef.current = {
    isOpen,
    options,
    isLoading,
  };

  const handlersRef = useRef({
    handleConfirm,
    handleCancel,
    close,
  });
  handlersRef.current = {
    handleConfirm,
    handleCancel,
    close,
  };

  const tRef = useRef(t);
  tRef.current = t;

  const ConfirmModal = useMemo(() => {
    return function ConfirmModalComponent() {
      const { isOpen: openState, options: currentOptions, isLoading: loadingState } = stateRef.current;
      const {
        handleConfirm: currentHandleConfirm,
        handleCancel: currentHandleCancel,
        close: currentClose,
      } = handlersRef.current;

      if (!openState || !currentOptions) return null;

      return (
        <Dialog open={openState} onOpenChange={(nextOpen) => { if (!nextOpen) currentClose(); }}>
          <DialogContent className="sm:max-w-md border-border/70 bg-card/90 backdrop-blur-xl">
            <DialogHeader>
              <DialogTitle>{currentOptions.title}</DialogTitle>
              <DialogDescription>{currentOptions.message}</DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-6 gap-2">
              <Button variant="outline" onClick={currentHandleCancel} disabled={loadingState}>
                {currentOptions.cancelText ?? tRef.current("confirm.cancel")}
              </Button>
              <Button
                onClick={currentHandleConfirm}
                disabled={loadingState}
                variant={currentOptions.variant === "destructive" ? "destructive" : "default"}
              >
                {loadingState && (
                  <span className="w-4 h-4 border-2 border-transparent border-t-current rounded-full animate-spin mr-2" />
                )}
                {currentOptions.confirmText ?? tRef.current("confirm.confirm")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      );
    };
  }, []);

  return { open, close, ConfirmModal };
}
