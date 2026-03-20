"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface LiveIndicatorProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  showText?: boolean;
}

export const LiveIndicator: React.FC<LiveIndicatorProps> = ({
  className,
  size = "md",
  showText = true,
}) => {
  const sizeClasses = {
    sm: "w-2 h-2",
    md: "w-3 h-3",
    lg: "w-4 h-4",
  };

  const textClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-full",
        "bg-success/10 border border-success/20",
        className
      )}
    >
      <div className="relative">
        <div
          className={cn(
            sizeClasses[size],
            "rounded-full bg-success",
            "animate-pulse"
          )}
        />
        <div
          className={cn(
            sizeClasses[size],
            "absolute inset-0 rounded-full bg-success",
            "animate-ping opacity-75"
          )}
        />
      </div>
      {showText && (
        <span className={cn("font-semibold text-success", textClasses[size])}>
          LIVE
        </span>
      )}
    </div>
  );
};
