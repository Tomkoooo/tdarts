"use client"
import { useTranslations } from "next-intl";

import React, { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { SmartInput, TodoItemData } from "@/components/admin/SmartInput"
import { IconCheck } from "@tabler/icons-react"
import axios from "axios"
import toast from "react-hot-toast"

export function GlobalTodoShortcut() {
    const t = useTranslations("Admin.components");
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "j" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setIsOpen((open) => !open)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  const handleAddTodo = async (todoData: Partial<TodoItemData>) => {
    try {
      await axios.post("/api/admin/todos", {
        ...todoData,
        status: "pending",
        isPublic: true
      })
      toast.success(t("feladat_gyorsan_hozzáadva"), {
        icon: <IconCheck className="text-emerald-500" />,
        style: {
          borderRadius: "10px",
          background: "#333",
          color: "#fff",
        },
      })
      setIsOpen(false)
    } catch (error) {
      console.error("Error creating todo", error)
      toast.error(t("hiba_történt_a_88"))
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen} >
      <DialogContent className="sm:max-w-[600px] h-[300px] p-0 gap-0 overflow-hidden bg-background/95 backdrop-blur-xl border-border/50 shadow-2xl">
        <div className="p-6 pb-2">
            <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
                {t("gyors_feladat_létrehozása")}</DialogTitle>
            <DialogDescription>
                {t("használd_a_természetes")}</DialogDescription>
            </DialogHeader>
        </div>
        <div className="p-6 pt-2 pb-8">
            <SmartInput onAdd={handleAddTodo} autoFocus />
        </div>
      </DialogContent>
    </Dialog>
  )
}
