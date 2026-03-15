"use client"

import React, { useEffect } from "react"
import { useRouter } from "next/navigation"
import MarketingHomeContent from "@/components/home/MarketingHomeContent"
import { useUserContext } from "@/hooks/useUser"

export default function HomePage() {
  const router = useRouter()
  const { user } = useUserContext()

  useEffect(() => {
    if (user?._id) {
      router.replace("/home")
    }
  }, [router, user?._id])

  if (user?._id) {
    return null
  }

  return <MarketingHomeContent />
}
