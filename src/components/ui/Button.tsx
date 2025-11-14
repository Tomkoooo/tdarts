"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { motion, HTMLMotionProps } from "framer-motion"
import { hoverLift } from "@/lib/motion"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "relative inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // Liquid Primary - Gradient fill with inner glow
        default: [
          "bg-gradient-to-r from-primary to-primary-dark",
          "text-primary-foreground",
          "shadow-lg shadow-primary/40",
          "backdrop-blur-sm",
          "before:absolute before:inset-0 before:bg-white/10 before:rounded-lg before:opacity-0 before:transition-opacity before:duration-300",
          "hover:before:opacity-100",
          "hover:shadow-xl hover:shadow-primary/50",
        ],
        // Glass Ghost - Transparent with glass effect
        ghost: [
          "bg-white/8 backdrop-blur-md",
          "border border-white/10",
          "text-foreground",
          "hover:bg-white/12 hover:backdrop-blur-xl",
          "hover:border-white/15",
        ],
        // Glass Outline - Border with glass fill
        outline: [
          "bg-white/5 backdrop-blur-sm",
          "border border-primary/30",
          "text-primary",
          "hover:bg-white/10 hover:border-primary/50",
          "hover:backdrop-blur-md",
        ],
        // Glass Secondary - Muted glass
        secondary: [
          "bg-white/6 backdrop-blur-md",
          "border border-white/8",
          "text-secondary-foreground",
          "hover:bg-white/10 hover:backdrop-blur-lg",
        ],
        // Destructive with glass
        destructive: [
          "bg-gradient-to-r from-destructive to-destructive/80",
          "text-destructive-foreground",
          "shadow-lg shadow-destructive/40",
          "backdrop-blur-sm",
          "before:absolute before:inset-0 before:bg-white/10 before:rounded-lg before:opacity-0 before:transition-opacity before:duration-300",
          "hover:before:opacity-100",
          "hover:shadow-xl hover:shadow-destructive/50",
        ],
        // Info with glass
        info: [
          "bg-gradient-to-r from-[oklch(70%_0.16_233)] to-[oklch(60%_0.16_233)]",
          "text-white",
          "shadow-lg shadow-[oklch(70%_0.16_233)]/40",
          "backdrop-blur-sm",
          "hover:shadow-xl hover:shadow-[oklch(70%_0.16_233)]/50",
        ],
        // Success with glass
        success: [
          "bg-gradient-to-r from-[oklch(64%_0.2_132)] to-[oklch(54%_0.2_132)]",
          "text-white",
          "shadow-lg shadow-[oklch(64%_0.2_132)]/40",
          "backdrop-blur-sm",
          "hover:shadow-xl hover:shadow-[oklch(64%_0.2_132)]/50",
        ],
        // Link variant (no glass)
        link: "text-primary underline-offset-4 hover:underline bg-transparent",
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
  extends Omit<HTMLMotionProps<"button">, "ref">,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  disableMotion?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, disableMotion = false, ...props }, ref) => {
    const Comp = asChild ? Slot : disableMotion ? "button" : motion.button
    
    const motionProps = disableMotion
      ? {}
      : {
          variants: hoverLift,
          initial: "rest",
          whileHover: "hover",
          whileTap: "tap",
        }
    
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...motionProps}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
