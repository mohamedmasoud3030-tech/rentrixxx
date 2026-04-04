import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  accentClassName?: string;
}

const Card: React.FC<CardProps> = ({ children, className = '', accentClassName }) => {
  return (
    <div className={`bg-rx-surface border border-rx rounded-xl p-4 sm:p-5 md:p-6 ${accentClassName ?? ''} ${className}`}>
      {children}
    </div>
  );
};

export default Card;
