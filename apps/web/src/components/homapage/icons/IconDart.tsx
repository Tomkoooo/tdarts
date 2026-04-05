import React from 'react';

interface IconDartProps {
  size?: number;
  className?: string;
}

const IconDart: React.FC<IconDartProps> = ({ size = 24, className = '' }) => {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
      className={className}
    >
      <path d="M12 2L2 22l10-5 10 5L12 2z" />
      <path d="M12 2v20" />
    </svg>
  );
};

export default IconDart;