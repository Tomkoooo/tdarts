import React from 'react';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
}

const sizeClassMap: Record<NonNullable<SpinnerProps['size']>, string> = {
  sm: 'text-sm py-2',
  md: 'text-base py-4',
  lg: 'text-lg py-6',
};

export function Spinner({ size = 'md' }: SpinnerProps) {
  const sizeClass = sizeClassMap[size] || sizeClassMap['md'];
  return <div className={`text-center text-muted ${sizeClass}`}>Betöltés...</div>;
}