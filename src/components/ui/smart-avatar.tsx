"use client"

import React, { useState, useEffect, useCallback } from "react"
import { useInView } from "framer-motion"
import axios from "axios"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

interface SmartAvatarProps {
  playerId: string
  name: string
  className?: string
  fallbackClassName?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

export function SmartAvatar({
  playerId,
  name,
  className,
  fallbackClassName,
  size = 'md'
}: SmartAvatarProps) {
  const [profilePicture, setProfilePicture] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [hasFetched, setHasFetched] = useState(false)
  const [, setError] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)

  const ref = React.useRef(null)
  const isInView = useInView(ref, { once: true, amount: 0.1 })

  const fetchAvatar = useCallback(async () => {
    if (!playerId || hasFetched) return
    
    setIsLoading(true)
    setError(false)
    
    try {
      const response = await axios.get(`/api/players/${playerId}/avatar`)
      if (response.data?.imageUrl) {
        setProfilePicture(response.data.imageUrl)
      } else {
        setProfilePicture(null)
      }
    } catch (err) {
      console.error(`Failed to fetch avatar for player ${playerId}:`, err)
      setError(true)
    } finally {
      setIsLoading(false)
      setHasFetched(true)
    }
  }, [playerId, hasFetched])

  useEffect(() => {
    if (isInView && !hasFetched) {
      fetchAvatar()
    }
  }, [isInView, hasFetched, fetchAvatar])

  const initials = name
    ? name
        .split(' ')
        .filter(Boolean)
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : "??"

  const sizeClasses = {
    sm: 'h-8 w-8 text-[10px]',
    md: 'h-10 w-10 text-xs',
    lg: 'h-12 w-12 text-sm',
    xl: 'h-16 w-16 text-xl'
  }

  return (
    <div ref={ref} className={cn("relative shrink-0", sizeClasses[size], className)}>
      {(isLoading || (profilePicture && !imageLoaded)) && (
        <Skeleton className="absolute inset-0 rounded-full z-10" />
      )}
      
      <Avatar className={cn("h-full w-full", className)}>
        {profilePicture && (
          <AvatarImage
            src={profilePicture}
            alt={name}
            className="object-cover"
            onLoadingStatusChange={(status) => setImageLoaded(status === 'loaded')}
          />
        )}
        <AvatarFallback className={cn("bg-primary/10 text-primary font-bold", fallbackClassName)}>
          {initials}
        </AvatarFallback>
      </Avatar>
    </div>
  )
}
