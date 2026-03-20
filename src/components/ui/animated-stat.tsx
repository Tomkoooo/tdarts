"use client";

import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface AnimatedStatProps {
  number: string | number;
  label: string;
  sublabel?: string;
  icon?: React.ReactNode;
  color?: string;
}

export const AnimatedStat: React.FC<AnimatedStatProps> = ({
  number,
  label,
  sublabel,
  icon,
  color = "text-primary",
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  // Animate counting if number is numeric
  const isNumeric = typeof number === "number" || /^\d+/.test(String(number));
  const [displayNumber, setDisplayNumber] = useState(isNumeric ? 0 : number);

  useEffect(() => {
    if (!isNumeric || !isVisible) return;

    const target = parseInt(String(number));
    const duration = 2000;
    const steps = 60;
    const stepDuration = duration / steps;
    const increment = target / steps;

    let current = 0;
    const interval = setInterval(() => {
      current += increment;
      if (current >= target) {
        setDisplayNumber(target);
        clearInterval(interval);
      } else {
        setDisplayNumber(Math.floor(current));
      }
    }, stepDuration);

    return () => clearInterval(interval);
  }, [number, isNumeric, isVisible]);

  return (
    <div
      className={cn(
        "p-6 rounded-xl bg-gradient-to-br from-card to-card/50 border border-border/50",
        "transform transition-all duration-500",
        isVisible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0",
        "hover:border-primary/30 hover:shadow-lg hover:shadow-primary/10"
      )}
    >
      <div className="flex items-start justify-between gap-4 mb-4">
        {icon && <div className={cn("text-2xl", color)}>{icon}</div>}
      </div>
      <div className="space-y-2">
        <div className={cn("text-3xl font-bold", color)}>
          {displayNumber}
          {typeof number === "string" && !isNumeric ? number.replace(/^\d+/, "") : ""}
        </div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        {sublabel && <p className="text-xs text-muted-foreground">{sublabel}</p>}
      </div>
    </div>
  );
};
