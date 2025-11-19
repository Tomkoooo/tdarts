"use client"

import * as React from "react"
import { Label } from "@/components/ui/Label"
import { Input, type InputProps } from "@/components/ui/Input"
import { motion, AnimatePresence } from "framer-motion"
import { shake } from "@/lib/motion"
import { cn } from "@/lib/utils"

export interface FormFieldProps extends Omit<InputProps, 'error'> {
  label?: string
  error?: string
  helperText?: string
  required?: boolean
  icon?: React.ReactNode
}

// Error message animation
const errorVariants = {
  initial: { opacity: 0, y: -10, height: 0 },
  animate: { 
    opacity: 1, 
    y: 0, 
    height: "auto",
    transition: { 
      duration: 0.2,
      ease: [0.16, 1, 0.3, 1] as any
    }
  },
  exit: { 
    opacity: 0, 
    y: -10,
    height: 0,
    transition: { 
      duration: 0.15,
      ease: [0.16, 1, 0.3, 1] as any
    }
  },
}

const FormField = React.forwardRef<HTMLInputElement, FormFieldProps>(
  ({ label, error, helperText, required, icon, className, ...props }, ref) => {
    // Trigger shake animation when error changes
    const [shouldShake, setShouldShake] = React.useState(false)
    
    React.useEffect(() => {
      if (error) {
        setShouldShake(true)
        const timer = setTimeout(() => setShouldShake(false), 500)
        return () => clearTimeout(timer)
      }
    }, [error])
    
    return (
      <div className="space-y-2">
        {label && (
          <Label className="text-foreground font-medium">
            {label}
            {required && <span className="text-destructive ml-1">*</span>}
          </Label>
        )}
        <motion.div 
          className="relative"
          animate={shouldShake ? "animate" : ""}
          variants={shake}
        >
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground z-10">
              {icon}
            </div>
          )}
          <Input
            ref={ref}
            error={!!error}
            className={cn(icon && "pl-10", className)}
            {...props}
          />
        </motion.div>
        
        <AnimatePresence mode="wait">
          {error && (
            <motion.p
              key="error"
              variants={errorVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="text-sm text-destructive font-medium overflow-hidden"
            >
              {error}
            </motion.p>
          )}
          {helperText && !error && (
            <motion.p
              key="helper"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="text-sm text-muted-foreground"
            >
              {helperText}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    )
  }
)
FormField.displayName = "FormField"

export { FormField }

