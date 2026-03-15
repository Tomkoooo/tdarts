"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface GlassmorphismCardProps {
  children: React.ReactNode;
  className?: string;
  intensity?: "light" | "medium" | "strong";
}

export const GlassmorphismCard: React.FC<GlassmorphismCardProps> = ({
  children,
  className,
  intensity = "medium",
}) => {
  const intensityClasses = {
    light: "bg-card/30 backdrop-blur-sm border-border/30",
    medium: "bg-card/50 backdrop-blur-md border-border/50",
    strong: "bg-card/70 backdrop-blur-lg border-border/70",
  };

  return (
    <div
      className={cn(
        "rounded-xl border transition-all duration-300",
        "hover:shadow-lg hover:shadow-primary/10",
        intensityClasses[intensity],
        className
      )}
    >
      {children}
    </div>
  );
};
