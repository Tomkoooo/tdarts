import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow-[0_2px_8px_0_oklch(51%_0.18_16_/_0.3)]",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground shadow-[0_2px_8px_0_oklch(60%_0.184_16_/_0.3)]",
        outline: "text-foreground border-border",
        success:
          "border-transparent bg-[oklch(64%_0.2_132)] text-white shadow-[0_2px_8px_0_oklch(64%_0.2_132_/_0.3)]",
        warning:
          "border-transparent bg-[oklch(68%_0.162_76)] text-[oklch(15%_0.025_12)] shadow-[0_2px_8px_0_oklch(68%_0.162_76_/_0.3)]",
        info:
          "border-transparent bg-[oklch(70%_0.16_233)] text-white shadow-[0_2px_8px_0_oklch(70%_0.16_233_/_0.3)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
