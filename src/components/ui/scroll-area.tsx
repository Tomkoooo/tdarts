import * as React from "react"

import { cn } from "@/lib/utils"

const ScrollArea = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("relative overflow-y-auto", className)} {...props}>
        {children}
      </div>
    )
  },
)
ScrollArea.displayName = "ScrollArea"

const ScrollBar = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("pointer-events-none absolute right-1 top-1 bottom-1 w-1 rounded-full bg-muted/40", className)}
      {...props}
    />
  ),
)
ScrollBar.displayName = "ScrollBar"

export { ScrollArea, ScrollBar }
