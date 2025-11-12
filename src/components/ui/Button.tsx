import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-sm shadow-black/25 hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm shadow-black/25 hover:bg-destructive/90",
        outline:
          "border border-primary/30 bg-card/90 text-primary shadow-sm shadow-black/20 hover:border-primary hover:bg-card/95 hover:text-primary/90 hover:shadow-md",
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm shadow-black/20 hover:bg-secondary/80",
        ghost:
          "text-muted-foreground hover:text-foreground hover:bg-muted/30 hover:shadow-sm shadow-black/10 transition-all focus-visible:bg-muted/15",
        info:
          "bg-[oklch(70%_0.16_233)] text-white shadow-sm shadow-black/20 hover:bg-[oklch(70%_0.16_233)]/90",
        link: "text-primary underline-offset-4 hover:underline",
        success:
          "bg-[oklch(64%_0.2_132)] text-white shadow-sm shadow-black/20 hover:bg-[oklch(64%_0.2_132)]/90",
      },
      size: {
        default: "h-11 px-6 py-2.5",
        sm: "h-9 rounded-md px-4 text-xs",
        lg: "h-12 rounded-lg px-8 text-base",
        xl: "h-14 rounded-xl px-10 text-lg",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
