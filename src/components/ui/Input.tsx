import * as React from "react"

import { normalizeNumericDraft, type NumericBlurMode, type NumericEditableValue, type NumericParseMode } from "@/lib/number-input"
import { cn } from "@/lib/utils"

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  numericEditing?: boolean
  onNumberChange?: (value: NumericEditableValue) => void
  parseMode?: NumericParseMode
  normalizeOnBlur?: NumericBlurMode
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, numericEditing, onNumberChange, parseMode = "int", normalizeOnBlur = "zero", value, onChange, onBlur, onFocus, min, ...props }, ref) => {
    const isNumberField = type === "number"
    const numericMode = isNumberField && numericEditing !== false
    const isControlled = value !== undefined
    const minAsNumber = typeof min === "number" ? min : typeof min === "string" ? Number.parseFloat(min) : undefined
    const externalDisplayValue = value === null || value === undefined ? "" : String(value)
    const [draftValue, setDraftValue] = React.useState(externalDisplayValue)
    const [isFocused, setIsFocused] = React.useState(false)

    React.useEffect(() => {
      if (!numericMode || !isControlled) return
      if (!isFocused) {
        setDraftValue(externalDisplayValue)
      }
    }, [numericMode, isControlled, isFocused, externalDisplayValue])

    const handleFocus = (event: React.FocusEvent<HTMLInputElement>) => {
      if (numericMode && isControlled) {
        setIsFocused(true)
        setDraftValue(externalDisplayValue)
      }
      onFocus?.(event)
    }

    const handleBlur = (event: React.FocusEvent<HTMLInputElement>) => {
      if (numericMode && isControlled) {
        setIsFocused(false)
        const normalized = normalizeNumericDraft(draftValue, {
          parseMode,
          blurMode: normalizeOnBlur,
          min: minAsNumber,
        })
        setDraftValue(normalized.draftValue)
        onNumberChange?.(normalized.parsedValue)
      }
      onBlur?.(event)
    }

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      if (numericMode && isControlled) {
        const raw = event.target.value
        setDraftValue(raw)
        const normalized = normalizeNumericDraft(raw, {
          parseMode,
          blurMode: "none",
        })
        onNumberChange?.(normalized.parsedValue)
      }
      onChange?.(event)
    }

    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        min={min}
        value={numericMode && isControlled ? (isFocused ? draftValue : externalDisplayValue) : value}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onChange={handleChange}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
