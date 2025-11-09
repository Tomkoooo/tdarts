import * as React from "react"
import { Label } from "@/components/ui/label"
import { Input, type InputProps } from "@/components/ui/input"
import { cn } from "@/lib/utils"

export interface FormFieldProps extends InputProps {
  label?: string
  error?: string
  helperText?: string
  required?: boolean
  icon?: React.ReactNode
}

const FormField = React.forwardRef<HTMLInputElement, FormFieldProps>(
  ({ label, error, helperText, required, icon, className, ...props }, ref) => {
    return (
      <div className="space-y-2">
        {label && (
          <Label className="text-foreground font-medium">
            {label}
            {required && <span className="text-destructive ml-1">*</span>}
          </Label>
        )}
        <div className="relative">
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
        </div>
        {error && (
          <p className="text-sm text-destructive font-medium">{error}</p>
        )}
        {helperText && !error && (
          <p className="text-sm text-muted-foreground">{helperText}</p>
        )}
      </div>
    )
  }
)
FormField.displayName = "FormField"

export { FormField }

