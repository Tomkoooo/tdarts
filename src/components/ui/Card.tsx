"use client"

import * as React from "react"
import { motion, HTMLMotionProps } from "framer-motion"
import { liquidIn } from "@/lib/motion"
import { cn } from "@/lib/utils"

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  elevation?: "base" | "elevated" | "modal"
  disableMotion?: boolean
}

const glassVariants = {
  base: "bg-white/8 backdrop-blur-lg border border-white/10",
  elevated: "bg-white/12 backdrop-blur-xl border border-white/15",
  modal: "bg-white/15 backdrop-blur-2xl border border-white/20",
}

const shadowVariants = {
  base: "shadow-xl shadow-black/20",
  elevated: "shadow-2xl shadow-black/30",
  modal: "shadow-2xl shadow-black/40",
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, elevation = "base", disableMotion = false, ...props }, ref) => {
    const baseClasses = cn(
      "relative rounded-xl overflow-hidden",
      "before:absolute before:inset-0 before:bg-white/5 before:rounded-xl before:pointer-events-none",
      glassVariants[elevation],
      shadowVariants[elevation],
      "transition-all duration-300",
      "text-card-foreground",
      className
    )
    
    if (disableMotion) {
      return (
        <div
          ref={ref}
          className={cn(baseClasses, "hover:scale-[1.01] hover:shadow-2xl hover:shadow-primary/10")}
          {...props}
        />
      )
    }
    
    return (
      <motion.div
        ref={ref}
        className={baseClasses}
        variants={liquidIn}
        initial="initial"
        animate="animate"
        whileHover={{
          scale: 1.01,
          y: -2,
          transition: { type: "spring", stiffness: 300, damping: 30 },
        }}
        {...(props as HTMLMotionProps<"div">)}
      />
    )
  }
)
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "text-2xl font-bold leading-none tracking-tight text-foreground",
      className
    )}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
