"use client"

import React, { createContext, useContext, useState, ReactNode } from "react"
import { useTranslations } from "next-intl"
import { IconAlertCircle, IconCircleCheck, IconCircleX, IconInfoCircle, IconX } from "@tabler/icons-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/Button"
import { Skeleton } from "@/components/ui/skeleton"
import { motion } from "framer-motion"

export type ModalType = "confirm" | "alert" | "success" | "error" | "info"
export type ModalSize = "sm" | "md" | "lg" | "xl" | "full"

export interface ModalConfig {
  type: ModalType
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  onConfirm?: () => void | Promise<void>
  onCancel?: () => void
  isLoading?: boolean
  size?: ModalSize
  showSkeleton?: boolean
}

interface ModalContextType {
  open: (config: ModalConfig) => void
  close: () => void
  isOpen: boolean
  config: ModalConfig | null
}

const ModalContext = createContext<ModalContextType | undefined>(undefined)

export function ModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [config, setConfig] = useState<ModalConfig | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const open = (newConfig: ModalConfig) => {
    setConfig({ ...newConfig, isLoading: false })
    setIsOpen(true)
  }

  const close = () => {
    setIsOpen(false)
    setConfig(null)
    setIsLoading(false)
  }

  const handleConfirm = async () => {
    if (config?.onConfirm) {
      setIsLoading(true)
      try {
        await config.onConfirm()
      } finally {
        setIsLoading(false)
      }
    }
    close()
  }

  const handleCancel = () => {
    config?.onCancel?.()
    close()
  }

  return (
    <ModalContext.Provider value={{ open, close, isOpen, config }}>
      {children}
      {isOpen && config && (
        <UnifiedModal
          config={config}
          isLoading={isLoading}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
    </ModalContext.Provider>
  )
}

export function useModal() {
  const context = useContext(ModalContext)
  if (!context) {
    throw new Error("useModal must be used within ModalProvider")
  }
  return context
}

interface UnifiedModalProps {
  config: ModalConfig
  isLoading: boolean
  onConfirm: () => void | Promise<void>
  onCancel: () => void
}

function UnifiedModal({ config, isLoading, onConfirm, onCancel }: UnifiedModalProps) {
  const t = useTranslations("Modal")
  const sizeClass =
    config.size === "sm"
      ? "sm:max-w-sm"
      : config.size === "lg"
        ? "sm:max-w-2xl"
        : config.size === "xl"
          ? "sm:max-w-4xl"
          : config.size === "full"
            ? "sm:max-w-[96vw] h-[90vh]"
            : "sm:max-w-lg"

  const getIcon = () => {
    switch (config.type) {
      case "confirm":
        return <IconAlertCircle className="w-6 h-6 text-primary" />
      case "success":
        return <IconCircleCheck className="w-6 h-6 text-green-500" />
      case "error":
        return <IconCircleX className="w-6 h-6 text-red-500" />
      case "info":
        return <IconInfoCircle className="w-6 h-6 text-blue-500" />
      default:
        return null
    }
  }

  const showActions = config.type === "confirm" || config.type === "alert"

  return (
    <Dialog open={true}>
      <DialogContent className={`${sizeClass} border-border/70 bg-card/90 backdrop-blur-xl`}>
        <motion.div initial={{ opacity: 0, y: 8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.18 }}>
        <DialogHeader>
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 mt-0.5">
              {getIcon()}
            </div>
            <div className="flex-1">
              <DialogTitle className="text-xl">{config.title}</DialogTitle>
            </div>
            <button
              onClick={onCancel}
              className="inline-flex items-center justify-center rounded-md p-2 hover:bg-muted"
            >
              <IconX className="w-4 h-4" />
            </button>
          </div>
        </DialogHeader>

        {config.showSkeleton ? (
          <div className="mt-4 space-y-3">
            <Skeleton className="h-4 w-[80%]" />
            <Skeleton className="h-4 w-[92%]" />
            <Skeleton className="h-4 w-[68%]" />
          </div>
        ) : (
          <DialogDescription className="mt-4 text-base text-foreground">
            {config.message}
          </DialogDescription>
        )}

        {showActions && (
          <DialogFooter className="mt-8 flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
            >
              {config.cancelText || t("confirm.cancel")}
            </Button>
            <Button
              onClick={onConfirm}
              disabled={isLoading}
              className={config.type === "error" ? "bg-red-500 hover:bg-red-600" : ""}
            >
              {isLoading && (
                <div className="w-4 h-4 border-2 border-transparent border-t-current rounded-full animate-spin mr-2" />
              )}
              {config.confirmText || t("confirm.confirm")}
            </Button>
          </DialogFooter>
        )}
        </motion.div>
      </DialogContent>
    </Dialog>
  )
}
