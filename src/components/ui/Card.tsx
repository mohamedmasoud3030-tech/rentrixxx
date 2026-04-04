import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  accentClassName?: string;
}

const Card: React.FC<CardProps> = ({ children, className = '', accentClassName }) => {
  return (
    <div className={`bg-surface-container-low border border-outline-variant/40 rounded-xl p-4 sm:p-5 md:p-6 ${accentClassName ?? ''} ${className}`}>
      {children}
    </div>
  );
};

export default Card;
