"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import type { AppModalProps, AppModalSize } from "./types";

const sizeClasses: Record<AppModalSize, string> = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-md",
  lg: "sm:max-w-lg",
  xl: "sm:max-w-2xl",
  full: "sm:max-w-[96vw] sm:h-[90vh]",
};

export function AppModal({
  open,
  onOpenChange,
  size = "md",
  className = "",
  children,
}: AppModalProps) {
  const sizeClass = sizeClasses[size];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`${sizeClass} border-border/70 bg-card/90 backdrop-blur-xl max-h-[90vh] overflow-hidden flex flex-col p-0 shadow-2xl shadow-black/25 ${className}`}
      >
        {children}
      </DialogContent>
    </Dialog>
  );
}
