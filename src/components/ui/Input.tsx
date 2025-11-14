"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean
  variant?: "glass" | "solid"
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, variant = "glass", ...props }, ref) => {
    return (
      <div className="relative">
        <input
          type={type}
          className={cn(
            "flex h-11 w-full rounded-lg",
            "px-3 py-2 text-sm text-white",
            "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
            "placeholder:text-muted-foreground",
            "transition-all duration-200",
            "focus-visible:outline-none",
            "focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
            "disabled:cursor-not-allowed disabled:opacity-50",
            // Glass variant
            variant === "glass" && [
              "bg-white/8 backdrop-blur-md",
              "border border-white/15",
              "focus-visible:border-primary/50 focus-visible:bg-white/12",
            ],
            // Solid variant (fallback)
            variant === "solid" && [
              "bg-[rgba(38,12,18,0.85)]",
              "border border-white/15",
              "focus-visible:border-primary focus-visible:bg-[rgba(38,12,18,0.95)]",
            ],
            // Error state
            error && [
              "border-destructive/60",
              "focus-visible:ring-destructive",
              "focus-visible:border-destructive",
            ],
            className
          )}
          ref={ref}
          {...props}
        />
        {/* Inner glow on focus */}
        <div
          className={cn(
            "absolute inset-0 rounded-lg pointer-events-none transition-opacity duration-200",
            "bg-primary/10 opacity-0",
            "peer-focus:opacity-100"
          )}
          aria-hidden="true"
        />
      </div>
    )
  }
)
Input.displayName = "Input"

export { Input }
