
"use client"

import * as React from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

interface ImageWithSkeletonProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  containerClassName?: string
}

export function ImageWithSkeleton({ className, containerClassName, alt, src, ...props }: ImageWithSkeletonProps) {
  const [isLoading, setIsLoading] = React.useState(true)

  return (
    <div className={cn("relative overflow-hidden bg-muted", containerClassName)}>
      {isLoading && (
        <Skeleton className="absolute inset-0 w-full h-full" />
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        className={cn(
          "w-full h-full object-cover transition-opacity duration-300",
          isLoading ? "opacity-0" : "opacity-100",
          className
        )}
        alt={alt}
        onLoad={() => setIsLoading(false)}
        {...props}
      />
    </div>
  )
}
