"use client"

import * as React from "react"
import { motion, animate } from "framer-motion"
import { liveUpdate } from "@/lib/motion"
import { cn } from "@/lib/utils"

export interface AnimatedCounterProps {
  value: number
  className?: string
  duration?: number
  decimals?: number
  prefix?: string
  suffix?: string
}

/**
 * AnimatedCounter - Smoothly animates number changes with scale pulse
 * Perfect for live scores, counts, and real-time data updates
 */
export function AnimatedCounter({
  value,
  className,
  duration = 0.4,
  decimals = 0,
  prefix = "",
  suffix = "",
}: AnimatedCounterProps) {
  const [displayValue, setDisplayValue] = React.useState(value)
  const previousValue = React.useRef(value)

  React.useEffect(() => {
    if (value !== previousValue.current) {
      // Animate the value change
      const controls = animate(previousValue.current, value, {
        duration,
        ease: [0.16, 1, 0.3, 1],
        onUpdate: (latest) => {
          setDisplayValue(latest)
        },
      })

      previousValue.current = value

      return () => controls.stop()
    }
  }, [value, duration])

  const formattedValue = decimals > 0 
    ? displayValue.toFixed(decimals)
    : Math.round(displayValue)

  return (
    <motion.span
      key={value}
      variants={liveUpdate}
      animate="animate"
      className={cn("inline-block", className)}
    >
      {prefix}
      {formattedValue}
      {suffix}
    </motion.span>
  )
}

/**
 * SimpleCounter - Lightweight version without spring animation
 * Use when performance is critical or for frequent updates
 */
export function SimpleCounter({
  value,
  className,
  prefix = "",
  suffix = "",
}: Omit<AnimatedCounterProps, "duration" | "decimals">) {
  return (
    <motion.span
      key={value}
      animate={{ scale: [1, 1.15, 1] }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className={cn("inline-block", className)}
    >
      {prefix}
      {value}
      {suffix}
    </motion.span>
  )
}

