import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const glassCardVariants = cva(
  "backdrop-filter backdrop-blur-2xl border rounded-xl shadow-lg",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-br from-white/10 to-white/5 border-white/20",
        primary:
          "bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20",
        card:
          "bg-card/95 border-border",
      },
      padding: {
        none: "",
        sm: "p-4",
        md: "p-6",
        lg: "p-8",
      },
      shadow: {
        none: "",
        default: "shadow-lg",
        glow: "shadow-lg shadow-primary/20",
      },
    },
    defaultVariants: {
      variant: "default",
      padding: "md",
      shadow: "default",
    },
  }
)

export interface GlassCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof glassCardVariants> {}

const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, variant, padding, shadow, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(glassCardVariants({ variant, padding, shadow }), className)}
      {...props}
    />
  )
)

GlassCard.displayName = "GlassCard"

export { GlassCard, glassCardVariants }
