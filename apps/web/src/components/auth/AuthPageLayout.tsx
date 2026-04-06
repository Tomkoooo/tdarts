"use client"

import React from "react"
import { GlassmorphismCard } from "@/components/ui/glassmorphism-card"
import { Button } from "@/components/ui/Button"
import { cn } from "@/lib/utils"

interface AuthPageLayoutProps {
  title: string
  subtitle?: string
  children?: React.ReactNode
  isSubmitting?: boolean
  onSubmit?: (e: React.FormEvent) => void
  showGoogleOption?: boolean
  onGoogleClick?: () => void
  footer?: React.ReactNode
  className?: string
}

export function AuthPageLayout({
  title,
  subtitle,
  children,
  isSubmitting = false,
  onSubmit,
  showGoogleOption = false,
  onGoogleClick,
  footer,
  className
}: AuthPageLayoutProps) {
  return (
    <div className="w-full min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/10 px-4">
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-96 h-96 bg-primary/10 rounded-full blur-3xl -top-10 -left-10" />
        <div className="absolute w-96 h-96 bg-primary/5 rounded-full blur-3xl -bottom-10 -right-10" />
      </div>

      <GlassmorphismCard className={cn("w-full max-w-md p-8 relative z-10", className)}>
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            {title}
          </h1>
          {subtitle && (
            <p className="text-muted-foreground">
              {subtitle}
            </p>
          )}
        </div>

        {/* Form Content */}
        <form onSubmit={onSubmit} className="space-y-6">
          {children}

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-11 font-semibold"
          >
            {isSubmitting ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-transparent border-t-primary-foreground rounded-full animate-spin" />
                <span>Processing...</span>
              </div>
            ) : (
              title
            )}
          </Button>
        </form>

        {/* Google Option */}
        {showGoogleOption && (
          <>
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-primary/10" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-background text-muted-foreground">
                  or continue with
                </span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full h-11"
              onClick={onGoogleClick}
              disabled={isSubmitting}
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Google
            </Button>
          </>
        )}

        {/* Footer */}
        {footer && (
          <div className="mt-8 text-center text-sm text-muted-foreground">
            {footer}
          </div>
        )}
      </GlassmorphismCard>
    </div>
  )
}
