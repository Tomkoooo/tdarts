import React from 'react';

interface NumericInputProps {
  value: number | string;
  onChange: (value: number) => void;
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
  const [internalValue, setInternalValue] = React.useState<string>(value.toString());

  // Sync internal value when external value changes
  React.useEffect(() => {
    setInternalValue(value.toString());
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;

    // Allow empty string
    if (newValue === '') {
      setInternalValue('');
      onChange(0);
      return;
    }

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

      // Parse and validate number
      const numValue = allowDecimal ? parseFloat(newValue) : parseInt(newValue);
      
      if (!isNaN(numValue)) {
        // Apply min/max constraints
        let finalValue = numValue;
        if (min !== undefined && numValue < min) {
          finalValue = min;
        }
        if (max !== undefined && numValue > max) {
          finalValue = max;
        }
        
        onChange(finalValue);
      }
    }
  };

  const handleBlur = () => {
    // On blur, if empty or just minus sign, reset to 0 or min
    if (internalValue === '' || internalValue === '-') {
      const defaultValue = min !== undefined && min > 0 ? min : 0;
      setInternalValue(defaultValue.toString());
      onChange(defaultValue);
    }
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
