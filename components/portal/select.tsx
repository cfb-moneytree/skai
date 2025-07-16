"use client";

import React from 'react';
import { ChevronDown } from 'lucide-react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  children: React.ReactNode;
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(({ className, children, ...props }, ref) => {
  return (
    <div className="relative">
      <select
        className={`
          appearance-none 
          w-full 
          bg-white 
          border 
          border-gray-300 
          text-gray-700 
          py-2 
          px-3 
          pr-8 
          rounded-md 
          leading-tight 
          focus:outline-none 
          focus:bg-white 
          focus:border-gray-500
          ${className}
        `}
        ref={ref}
        {...props}
      >
        {children}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
        <ChevronDown className="h-4 w-4" />
      </div>
    </div>
  );
});

Select.displayName = 'Select';

export { Select };