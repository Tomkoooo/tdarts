"use client"

import React, { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useUserContext } from "@/hooks/useUser"
import AuthenticatedHomeContent from "@/components/home/AuthenticatedHomeContent"

export default function AuthenticatedHomePage() {
  const router = useRouter()
  const { user } = useUserContext()

  useEffect(() => {
    if (!user?._id) {
      router.push("/auth/login?redirect=/home")
    }
  }, [router, user?._id])

  if (!user?._id) return null

  return <AuthenticatedHomeContent />
}
