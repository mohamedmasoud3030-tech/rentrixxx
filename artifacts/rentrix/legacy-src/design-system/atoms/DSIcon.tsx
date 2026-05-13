import React from 'react';

type IconSize = 'sm' | 'md' | 'lg';
const mapSize: Record<IconSize, number> = { sm: 14, md: 18, lg: 22 };

export const DSIcon: React.FC<{ children: React.ReactNode; size?: IconSize; className?: string }> = ({
  children,
  size = 'md',
  className = '',
}) => (
  <span className={`inline-flex shrink-0 items-center justify-center [&_svg]:stroke-[1.85] ${className}`} style={{ width: mapSize[size], height: mapSize[size] }}>
    {children}
  </span>
);
