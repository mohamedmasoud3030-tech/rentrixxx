import React from 'react';

type IconPosition = 'start' | 'end';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
  iconPosition?: IconPosition;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ icon, iconPosition = 'start', className = '', ...props }, ref) => {
    const input = (
      <input
        ref={ref}
        {...props}
        className={`rx-input ${
          icon ? (iconPosition === 'start' ? 'rx-input-with-icon-start' : 'rx-input-with-icon-end') : ''
        } ${className}`.trim()}
      />
    );

    if (!icon) return input;

    return (
      <div className="rx-input-wrapper">
        <span
          className={`rx-input-icon ${
            iconPosition === 'start' ? 'rx-input-icon-start' : 'rx-input-icon-end'
          }`}
          aria-hidden="true"
        >
          {icon}
        </span>
        {input}
      </div>
    );
  },
);

Input.displayName = 'Input';

export default Input;
