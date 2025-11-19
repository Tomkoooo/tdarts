"use client"

import * as React from "react"
import * as TooltipPrimitive from "@radix-ui/react-tooltip"
import { motion } from "framer-motion"
import { fadeInScale } from "@/lib/motion"

import { cn } from "@/lib/utils"

const TooltipProvider = TooltipPrimitive.Provider

const Tooltip = TooltipPrimitive.Root

const TooltipTrigger = TooltipPrimitive.Trigger

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 6, ...props }, ref) => (
  <TooltipPrimitive.Content ref={ref} sideOffset={sideOffset} asChild {...props}>
    <motion.div
      variants={fadeInScale}
      initial="initial"
      animate="animate"
      exit="exit"
    className={cn(
        "z-50 overflow-hidden rounded-xl border border-white/10",
        "bg-popover/95 backdrop-blur-xl px-3 py-2",
        "text-xs text-popover-foreground",
        "shadow-glass-lg",
      className
    )}
  />
  </TooltipPrimitive.Content>
))
TooltipContent.displayName = TooltipPrimitive.Content.displayName

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
