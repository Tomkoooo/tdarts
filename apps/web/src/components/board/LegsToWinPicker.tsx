"use client";

import React from "react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

interface LegsToWinPickerProps {
  value: number;
  onChange: (value: number) => void;
  max?: number;
}

export const LegsToWinPicker: React.FC<LegsToWinPickerProps> = ({
  value,
  onChange,
  max = 20,
}) => {
  return (
    <div className="grid grid-cols-5 gap-2">
      {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
        <Button
          key={n}
          type="button"
          variant={value === n ? "default" : "outline"}
          className={cn(
            "min-h-11 w-full text-base font-bold touch-manipulation",
            value === n && "ring-2 ring-primary ring-offset-2 ring-offset-background"
          )}
          onClick={() => onChange(n)}
        >
          {n}
        </Button>
      ))}
    </div>
  );
};

export default LegsToWinPicker;
