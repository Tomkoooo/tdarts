"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { motion, HTMLMotionProps } from "framer-motion"
import { hoverLift } from "@/lib/motion"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "btn",
  {
    variants: {
      variant: {
        // Liquid Primary - Gradient fill with inner glow
        default: [
          "btn btn-primary",
          "text-primary-foreground",

          "backdrop-blur-sm",

        ],
        // Glass Ghost - Transparent with glass effect
        ghost: [
          "btn-ghost",
          "text-foreground",
          "hover:bg-accent/10 hover:text-accent-foreground",
        ],
        // Glass Outline - Border with glass fill
        outline: [
          " backdrop-blur-xl",
          "border border-primary/30",
          "text-white",
          " hover:border-primary/50",
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
          "btn-info",
          "text-white",

        ],
        // Success with glass
        success: [
          "btn-success"
        ],
        error: [
          "btn-error",
          "text-error-foreground",


        ],
        warning: [
          "btn-warning",
          "text-warning-foreground",

        ],
        // Link variant (no glass)
        link: "text-primary underline-offset-4 hover:underline bg-transparent",
      },
      size: {
        default: "h-11 px-6 py-2.5",
        sm: "h-9 rounded-md px-4 text-xs",
        lg: "h-12 rounded-lg px-8 text-base",
        xl: "h-14 rounded-xl px-10 text-lg",
        icon: "h-12 w-12",
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
    if (asChild) {
      // Extract motion props for Slot (eslint-disable-next-line for unused destructured vars)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { variants, initial, whileHover, whileTap, ...slotProps } = props as any
      return (
        <Slot
          className={cn(buttonVariants({ variant, size, className }))}
          ref={ref}
          {...slotProps}
        />
      )
    }
    
    if (disableMotion) {
      // Extract motion props for regular button
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { variants, initial, whileHover, whileTap, ...buttonProps } = props as any
      return (
        <button
          className={cn(buttonVariants({ variant, size, className }))}
          ref={ref}
          {...buttonProps}
        />
      )
    }
    
    return (
      <motion.button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        variants={hoverLift}
        initial="rest"
        whileHover="hover"
        whileTap="tap"
        {...(props as HTMLMotionProps<"button">)}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
