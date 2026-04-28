import React from 'react';

type InputState = 'default' | 'error';

export const DSInput: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { state?: InputState }> = ({
  className = '',
  disabled,
  state = 'default',
  ...props
}) => (
  <input
    {...props}
    disabled={disabled}
    className={`w-full rounded-xl border bg-background px-3 py-2.5 text-sm text-text transition duration-200 placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 ${
      state === 'error' ? 'border-red-300 focus-visible:ring-red-200' : 'border-border focus-visible:ring-primary/20'
    } ${disabled ? 'cursor-not-allowed opacity-60' : ''} ${className}`}
  />
);
