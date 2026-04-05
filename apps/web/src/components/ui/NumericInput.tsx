import React from 'react';
import { coerceNumericValue, normalizeNumericDraft, type NumericEditableValue } from '@/lib/number-input';

interface NumericInputProps {
  value: NumericEditableValue | string;
  onChange: (value: NumericEditableValue) => void;
  min?: number;
  max?: number;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  allowNegative?: boolean;
  allowDecimal?: boolean;
}

/**
 * NumericInput Component
 * 
 * A custom numeric input that allows deleting the leading 0 and provides better UX.
 * Uses text input with numeric validation to avoid the default number input issues.
 */
export default function NumericInput({
  value,
  onChange,
  min,
  max,
  placeholder,
  className = '',
  disabled = false,
  allowNegative = false,
  allowDecimal = false
}: NumericInputProps) {
  const [internalValue, setInternalValue] = React.useState<string>(
    value === '' || value === null || value === undefined ? '' : String(value)
  );

  // Sync internal value when external value changes
  React.useEffect(() => {
    setInternalValue(value === '' || value === null || value === undefined ? '' : String(value));
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;

    // Build regex pattern based on options
    let pattern = '^';
    if (allowNegative) {
      pattern += '-?';
    }
    pattern += '\\d*';
    if (allowDecimal) {
      pattern += '(\\.\\d*)?';
    }
    pattern += '$';

    const regex = new RegExp(pattern);

    // Validate input
    if (regex.test(newValue) || (allowNegative && newValue === '-')) {
      setInternalValue(newValue);
      const normalized = normalizeNumericDraft(newValue, {
        parseMode: allowDecimal ? 'float' : 'int',
        blurMode: 'none',
      });
      if (normalized.parsedValue === '') {
        onChange('');
        return;
      }
      let finalValue = normalized.parsedValue;
      if (min !== undefined && typeof finalValue === 'number' && finalValue < min) {
        finalValue = min;
      }
      if (max !== undefined && typeof finalValue === 'number' && finalValue > max) {
        finalValue = max;
      }
      onChange(finalValue);
    }
  };

  const handleBlur = () => {
    const normalized = normalizeNumericDraft(internalValue, {
      parseMode: allowDecimal ? 'float' : 'int',
      blurMode: 'zero',
      min,
    });
    const coerced = coerceNumericValue(normalized.parsedValue, min !== undefined && min > 0 ? min : 0);
    let finalValue = coerced;
    if (max !== undefined && finalValue > max) {
      finalValue = max;
    }
    setInternalValue(String(finalValue));
    onChange(finalValue);
  };

  return (
    <input
      type="text"
      inputMode={allowDecimal ? 'decimal' : 'numeric'}
      value={internalValue}
      onChange={handleChange}
      onBlur={handleBlur}
      placeholder={placeholder}
      className={className}
      disabled={disabled}
    />
  );
}
